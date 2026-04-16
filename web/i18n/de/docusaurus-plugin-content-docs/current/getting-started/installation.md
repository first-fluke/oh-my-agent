---
title: Installation
description: Vollständige Installationsanleitung für oh-my-agent — drei Installationsmethoden, alle sechs Presets mit ihren Skill-Listen, CLI-Tool-Anforderungen für alle vier Anbieter, Konfiguration nach der Installation, Felder der oma-config.yaml und Verifikation mit oma doctor.
---

# Installation

## Voraussetzungen

- **Eine KI-gestützte IDE oder CLI** — mindestens eines der folgenden: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor oder OpenCode
- **bun** — JavaScript-Laufzeitumgebung und Paketmanager (wird bei Bedarf vom Installationsskript automatisch installiert)
- **uv** — Python-Paketmanager für Serena MCP (wird bei Bedarf automatisch installiert)

---

## Methode 1: Einzeiler-Installation (empfohlen)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Dieses Skript:
1. Erkennt Ihre Plattform (macOS, Linux)
2. Prüft auf bun und uv und installiert diese bei Bedarf
3. Führt den interaktiven Installer mit Preset-Auswahl aus
4. Erstellt `.agents/` mit Ihren ausgewählten Skills
5. Richtet die `.claude/`-Integrationsschicht ein (Hooks, Symlinks, Einstellungen)
6. Konfiguriert Serena MCP, falls erkannt

Typische Installationszeit: unter 60 Sekunden.

---

## Methode 2: Manuelle Installation via bunx

```bash
bunx oh-my-agent@latest
```

Dies startet den interaktiven Installer ohne den Abhängigkeits-Bootstrap. bun muss bereits installiert sein.

Der Installer fordert Sie auf, ein Preset auszuwählen, das bestimmt, welche Skills installiert werden:

### Presets

| Preset | Enthaltene Skills |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Jedes Preset enthält oma-pm (Planung), oma-qa (Review), oma-debug (Bugfixing), oma-brainstorm (Ideenfindung) und oma-scm (Git) als Basisagenten. Domänenspezifische Presets fügen die relevanten Implementierungsagenten hinzu.

Die gemeinsamen Ressourcen (`_shared/`) werden unabhängig vom Preset immer installiert. Dies umfasst Kern-Routing, Context-Loading, Prompt-Struktur, Vendor-Erkennung, Ausführungsprotokolle und Memory-Protokoll.

### Was erstellt wird

Nach der Installation enthält Ihr Projekt:

```
.agents/
├── config/
│   └── oma-config.yaml      # Ihre Einstellungen
├── skills/
│   ├── _shared/                    # Gemeinsame Ressourcen (immer installiert)
│   │   ├── core/                   # skill-routing, context-loading usw.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger usw.
│   ├── oma-frontend/               # Je nach Preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Weitere ausgewählte Skills
├── workflows/                      # Alle 14 Workflow-Definitionen
├── agents/                         # Subagenten-Definitionen
├── mcp.json                        # MCP-Server-Konfiguration
├── results/plan-{sessionId}.json                       # Leer (befüllt durch /plan)
├── state/                          # Leer (verwendet von persistenten Workflows)
└── results/                        # Leer (befüllt durch Agentenläufe)

.claude/
├── settings.json                   # Hooks und Berechtigungen
├── hooks/
│   ├── triggers.json               # Keyword-zu-Workflow-Zuordnung (11 Sprachen)
│   ├── keyword-detector.ts         # Auto-Erkennungslogik
│   ├── persistent-mode.ts          # Persistenter-Workflow-Durchsetzung
│   └── hud.ts                      # [OMA]-Statuszeilen-Indikator
├── skills/                         # Symlinks -> .agents/skills/
└── agents/                         # Subagenten-Definitionen für IDE

.serena/
└── memories/                       # Laufzeitzustand (befüllt während Sitzungen)
```

---

## Methode 3: Globale Installation

Für CLI-Nutzung (Dashboards, Agenten-Spawning, Diagnose) oh-my-agent global installieren:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# oder
npm install --global oh-my-agent
```

Dies installiert den Befehl `oma` global und gibt Ihnen Zugang zu allen CLI-Befehlen aus jedem Verzeichnis:

```bash
oma doctor              # Gesundheitscheck
oma dashboard           # Terminal-Überwachung
oma dashboard:web       # Web-Dashboard unter http://localhost:9847
oma agent:spawn         # Agenten vom Terminal starten
oma agent:parallel      # Parallele Agentenausführung
oma agent:status        # Agentenstatus prüfen
oma stats               # Sitzungsstatistiken
oma retro               # Retrospektiven-Analyse
oma cleanup             # Sitzungsartefakte bereinigen
oma update              # oh-my-agent aktualisieren
oma verify              # Agentenausgabe verifizieren
oma visualize           # Abh��ngigkeitsvisualisierung
oma describe            # Projektstruktur beschreiben
oma bridge              # SSE-zu-stdio-Brücke für Antigravity
oma memory:init         # Memory-Provider initialisieren
oma auth:status         # CLI-Authentifizierungsstatus prüfen
oma star                # Repository mit Stern markieren
```

`oma` ist die Kurzform von `oh-my-agent`. Beide funktionieren als CLI-Befehle.

---

## Installation der KI-CLI-Tools

Sie benötigen mindestens ein installiertes KI-CLI-Tool. oh-my-agent unterstützt vier Anbieter, und Sie können diese mischen — verschiedene CLIs für verschiedene Agenten über die Agenten-CLI-Zuordnung.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# oder
npm install --global @google/gemini-cli
```

Die Authentifizierung erfolgt automatisch beim ersten Start. Gemini CLI liest Skills standardmäßig aus `.agents/skills/`.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# oder
npm install --global @anthropic-ai/claude-code
```

Die Authentifizierung erfolgt automatisch beim ersten Start. Claude Code verwendet `.claude/` für Hooks und Einstellungen, wobei Skills per Symlink aus `.agents/skills/` verknüpft werden.

### Codex CLI

```bash
bun install --global @openai/codex
# oder
npm install --global @openai/codex
```

Nach der Installation `codex login` zur Authentifizierung ausführen.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Nach der Installation `/auth` innerhalb der CLI zur Authentifizierung ausführen.

---

## oma-config.yaml

Der Befehl `oma install` erstellt `.agents/oma-config.yaml`. Dies ist die zentrale Konfigurationsdatei für das gesamte Verhalten von oh-my-agent:

```yaml
# Antwortsprache für alle Agenten und Workflows
language: en

# Datumsformat für Berichte und Memory-Dateien
date_format: "YYYY-MM-DD"

# Zeitzone für Zeitstempel
timezone: "UTC"

# Standard-CLI-Tool für das Starten von Agenten
# Optionen: gemini, claude, codex, qwen
default_cli: gemini

# Pro-Agent-CLI-Zuordnung (überschreibt default_cli)
agent_cli_mapping:
  frontend: claude       # Komplexes UI-Reasoning
  backend: gemini        # Schnelle API-Generierung
  mobile: gemini
  db: gemini
  pm: gemini             # Schnelle Zerlegung
  qa: claude             # Gründliches Sicherheits-Review
  debug: claude          # Tiefe Grundursachenanalyse
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Feldreferenz

| Feld | Typ | Standard | Beschreibung |
|-------|------|---------|-------------|
| `language` | String | `en` | Antwortsprachcode. Alle Agentenausgaben, Workflow-Nachrichten und Berichte verwenden diese Sprache. Unterstützt 11 Sprachen (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | String | `YYYY-MM-DD` | Datumsformat für Zeitstempel in Plänen, Memory-Dateien und Berichten. |
| `timezone` | String | `UTC` | Zeitzone für alle Zeitstempel. Verwendet Standard-Zeitzonen-Bezeichner (z. B. `Asia/Seoul`, `America/New_York`). |
| `default_cli` | String | `gemini` | Fallback-CLI, wenn keine agentenspezifische Zuordnung existiert. Wird als Ebene 3 in der Vendor-Auflösungspriorität verwendet. |
| `agent_cli_mapping` | Map | (leer) | Ordnet Agenten-IDs bestimmten CLI-Anbietern zu. Hat Vorrang vor `default_cli`. |

### Vendor-Auflösungspriorität

Beim Starten eines Agenten wird der CLI-Anbieter durch diese Prioritätsreihenfolge bestimmt (höchste zuerst):

1. `--model`-Flag an `oma agent:spawn` übergeben
2. `agent_cli_mapping`-Eintrag für den spezifischen Agenten in `oma-config.yaml`
3. `default_cli`-Einstellung in `oma-config.yaml`
4. `active_vendor` in `cli-config.yaml` (Legacy-Fallback)
5. `gemini` (fest codierter endgültiger Fallback)

---

## Verifikation: `oma doctor`

Nach Installation und Einrichtung prüfen, ob alles funktioniert:

```bash
oma doctor
```

Dieser Befehl prüft:
- Alle erforderlichen CLI-Tools sind installiert und erreichbar
- MCP-Server-Konfiguration ist gültig
- Skill-Dateien existieren mit gültigem SKILL.md-Frontmatter
- Symlinks in `.claude/skills/` zeigen auf gültige Ziele
- Hooks sind korrekt in `.claude/settings.json` konfiguriert
- Memory-Provider ist erreichbar (Serena MCP)
- `oma-config.yaml` ist gültiges YAML mit erforderlichen Feldern

Falls etwas nicht stimmt, sagt `oma doctor` genau, was zu reparieren ist, mit kopierbereiten Befehlen.

---

## Aktualisierung

### CLI-Aktualisierung

```bash
oma update
```

Dies aktualisiert die globale oh-my-agent-CLI auf die neueste Version.

### Projekt-Skills-Aktualisierung

Skills und Workflows innerhalb eines Projekts können über die GitHub Action (`action/`) für automatisierte Aktualisierungen oder manuell durch erneutes Ausführen des Installers aktualisiert werden:

```bash
bunx oh-my-agent@latest
```

Der Installer erkennt vorhandene Installationen und bietet eine Aktualisierung an, wobei Ihre `oma-config.yaml` und benutzerdefinierte Konfigurationen erhalten bleiben.

---

## Nächste Schritte

Öffnen Sie Ihr Projekt in Ihrer KI-IDE und beginnen Sie mit der Nutzung von oh-my-agent. Skills werden automatisch erkannt. Probieren Sie:

```
"Build a login form with email validation using Tailwind CSS"
```

Oder verwenden Sie einen Workflow-Befehl:

```
/plan authentication feature with JWT and refresh tokens
```

Weitere Informationen finden Sie im [Nutzungsleitfaden](/docs/guide/usage) für detaillierte Beispiele oder unter [Agenten](/docs/core-concepts/agents), um zu verstehen, was jeder Spezialist tut.
