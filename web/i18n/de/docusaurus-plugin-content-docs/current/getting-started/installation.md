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

## Methode 1: Einzeiler-Installation

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

Das Bootstrap-Skript läuft auch nach Fehlern bei optionalen Abhängigkeiten weiter und nennt Folgebefehle. AgentMemory ist der standardmäßige Provider für semantisches Memory: `oma install` und `oma update` schlagen fehl, wenn seine Installation, sein Start oder sein Health-Check fehlschlägt. Wenn Sie `providers.semantic_memory: none` oder `honcho` auswählen oder `OMA_NO_AGENTMEMORY=1` setzen, wird die automatische Vorbereitung von AgentMemory übersprungen. Führen Sie nach Abschluss des Installers `oma doctor` aus.

---

## Methode 2: Manuelle Installation via bunx

```bash
bunx oh-my-agent@latest
```

Damit startet der interaktive Installer ohne Dependency-Bootstrap. bun muss bereits installiert sein.

Der Installer fordert Sie auf, ein [Skill-Preset](./glossary.md#skill-preset) auszuwählen. Die aktuellen Presets sind in `PRESETS` in `cli/constants/skill-data.ts` definiert:

### Presets

Wählen Sie das Preset, das zur Arbeit im Repository passt. Die Skill-Namen unten lassen das Präfix `oma-` weg.

| Preset | Passend, wenn das Projekt Folgendes umfasst | Enthaltene Skills | Anzahl |
|--------|-------------------------------|-----------------|-------|
| **all** | Beliebige Projekte, oder jeder Workflow soll sofort funktionieren | Jeder Skill in der Registry | 33 |
| **fullstack** | Web- und Mobile-Clients mit Backend und Terraform-Infrastruktur | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | Ein Web-Frontend mit Backend und Datenbank | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | Eine Mobile-App mit Backend und Datenbank | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Nur eine Web-UI | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | Eine API oder einen Service mit Datenbank | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | Nur eine Mobile-App | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Arbeit an Infrastruktur, CI/CD und Observability | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **research** | Papers, Marktforschung und PDF/HWP-Konvertierung | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Design-Assets, Bilder, Sprache und schriftliche Inhalte | design, image, voice, academic-writing, translation, scm | 6 |

Presets sind Skill-Bundles; sie erzeugen keine eigene Subagent-Definition pro Skill. Das Preset `all` wird aus der aktuellen Skill-Registry erweitert, daher kann die Liste mit dem Repository wachsen. Domänen-Presets enthalten nur die Skills für diesen Schwerpunkt.

### Workflows, die Skills außerhalb eines Presets benötigen {#workflows-that-need-skills-outside-a-preset}

Jedes Preset installiert alle Workflow- und Agentendefinitionen, aber mehrere Workflows lesen einen Skill, den Domänen-Presets nicht installieren. Prüfen Sie diese Tabelle, bevor Sie ein Domänen-Preset wählen:

| Workflow | Liest Skill | Presets, die ihn enthalten |
|----------|-------------|-------------------------|
| `/work`, `/orchestrate` | oma-coordination, oma-orchestration | all |
| `/ultrawork`, `/ralph` | oma-coordination; der dabei gestartete Agent `refactor-engineer` verwendet oma-refactor | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/convert` (PDF, HWP) | oma-pdf, oma-hwp | all, research |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture`, `/brainstorm`, `/plan`, `/review`, `/debug` | oma-architecture, oma-brainstorm, oma-pm, oma-qa, oma-debug | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/scm` | oma-scm | jedes Preset |

Um einen fehlenden Skill später hinzuzufügen, führen Sie `oma doctor` im Projekt-Root aus, bestätigen die Abfrage zu fehlenden Skills und wählen **Select individually**.

Die gemeinsamen Ressourcen (`_shared/`) werden unabhängig vom Preset immer installiert. Dazu gehören Core-Routing, Context Loading, Prompt-Struktur, Vendor-Erkennung, Ausführungsprotokolle und Memory-Protokoll.

### Was erstellt wird

Nach der Installation enthält Ihr Projekt:

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 21, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── config/                  # Shipped defaults (defaults.yaml)
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

Der Installer erstellt Vendor-Verzeichnisse nur für die ausgewählten Hosts. Die Hook-Quelle bleibt in `.agents/hooks/core/`; erzeugte Vendor-Dateien sind Integrationsausgaben. Serena kann in älteren Projekten zusätzlich das Legacy-Verzeichnis `.serena/memories/` verwenden.

---

## Methode 3: Globale Installation {#method-3-global-install}

Für CLI-Nutzung (Dashboards, Agenten-Spawning und Diagnose) installieren Sie oh-my-agent global:

:::note
Dieser Abschnitt installiert den Befehl `oma`. Das ist nicht dasselbe wie `oma install --global`, das Skills, Workflows und Regeln für jedes Projekt im globalen OMA-Home (`~/.oma/.agents/`) installiert. Siehe [Globale Installation](../guide/global-install.md).
:::

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
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
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
| `model_preset` | string | Ja | Aktiver Schlüssel des [Modell-Presets](./glossary.md#model-preset). `auto` folgt der aktuellen Laufzeit; feste Schlüssel sind `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` und `mixed`. Auch benutzerdefinierte Preset-Schlüssel sind gültig. Siehe [Modelle pro Agent](../guide/per-agent-models.md). |
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

```text
"Build a login form with email validation using Tailwind CSS"
```

Oder verwenden Sie einen Workflow-Befehl:

```text
/plan authentication feature with JWT and refresh tokens
```

Weitere Beispiele finden Sie im [Nutzungsleitfaden](/docs/guide/usage). Unter [Agenten](/docs/core-concepts/agents) erfahren Sie, welche Aufgaben die einzelnen Spezialisten übernehmen. Wenn sich die Installation oder ein Hook nicht wie erwartet verhält, siehe [Fehlerbehebung](../guide/troubleshooting.md).
