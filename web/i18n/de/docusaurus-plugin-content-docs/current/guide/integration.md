---
title: "Anleitung: Integration in ein bestehendes Projekt"
sidebar_label: Bestehende Projekte
description: Vollständige Anleitung zum Hinzufügen von oh-my-agent zu einem bestehenden Projekt mit CLI-Weg, manuellem Weg, Verifizierung, SSOT-Symlink-Struktur und einer Erklärung der Abläufe hinter dem Installer.
---

# Anleitung: Integration in ein bestehendes Projekt

## Zwei Integrationswege

Es gibt zwei Möglichkeiten, oh-my-agent zu einem bestehenden Projekt hinzuzufügen:

1. **CLI-Weg:** Führen Sie `oma` (oder `npx oh-my-agent`) aus und folgen Sie den interaktiven Eingabeaufforderungen. Für die meisten Benutzer empfohlen.
2. **Manueller Weg:** Kopieren Sie Dateien und konfigurieren Sie Symlinks selbst. Das ist für eingeschränkte Umgebungen oder benutzerdefinierte Setups nützlich.

Beide Wege erzeugen dasselbe Ergebnis: ein `.agents/`-Verzeichnis (die SSOT) sowie generierte Vendor-native Dateien wie `.claude/agents/`, `.codex/agents/` und `.qwen/agents/`.

---

## CLI-Weg: Schritt für Schritt

### 1. CLI installieren

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

Nach der globalen Installation ist der Befehl `oma` (oder `oh-my-agent`) verfügbar.

### 2. Zum Projektstamm navigieren

```bash
cd /path/to/your/project
```

Führen Sie den Installer aus dem Projektverzeichnis aus, das Sie konfigurieren möchten. OMA schreibt die SSOT relativ zu seinem Installationsstamm. Ein Git-Repository wird für Prüfung und Rollback empfohlen, ist für den Installer aber nicht erforderlich.

### 3. Installer ausführen

```bash
oma
```

Der Standardbefehl ohne Unterbefehl startet den interaktiven Installer.

### 4. Projekttyp auswählen

Der Installer zeigt diese Presets an:

| Preset | Enthaltene Skills |
|:-------|:---------------|
| **All** | Jeder verfügbare Skill |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js-Skills |
| **Backend** | Python/Node.js/Rust-Backend-Skills |
| **Mobile** | Flutter/Dart-Mobile-Skills |
| **DevOps** | Terraform + CI/CD + Workflow-Skills |
| **Custom** | Einzelne Skills aus der vollständigen Liste auswählen |

### 5. Backend-Sprache wählen (falls zutreffend)

Wenn Sie ein Preset mit dem Backend-Skill ausgewählt haben, werden Sie gebeten, eine Sprachvariante auszuwählen:

- **Python:** FastAPI/SQLAlchemy (Standard)
- **Node.js:** NestJS/Hono + Prisma/Drizzle
- **Rust:** Axum/Actix-web
- **Andere / Auto-Erkennung:** Später mit `/stack-set` konfigurieren

### 6. IDE-Symlinks konfigurieren

Der Installer erstellt immer Claude-Code-Symlinks (`.claude/skills/`). Außerdem generiert er die nativen Agenten-Dateien, Hooks, Einstellungen und Integrationsdateien des ausgewählten Vendors. Zu den aktuellen Vendor-Familien gehören Antigravity, Claude, Codex, Cursor, Kiro, Kimi und Qwen sowie Erweiterungspfade für pi und OpenCode. Wenn ein `.github/`-Verzeichnis vorhanden ist, kann der Installer GitHub-Copilot-Symlinks automatisch erstellen. Bei Auswahl von **ZCode** stellt er Workflows als Slash-Befehle über `.zcode/commands/*.md`-Symlinks bereit (nur Workflows, keine Agenten-Dateien oder Hooks). Andernfalls fragt er:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Empfohlene globale Git-Konfiguration

Gegen Ende von `oma install` und `oma update` prüft die CLI zwei **globale** Git-Einstellungen, die Multi-Agenten-Workflows unterstützen:

| Schlüssel | Gewünschter Wert | Zweck |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | Aufgezeichnete Auflösung wiederverwenden — bei Multi-Agenten-Merges treten oft dieselben Konflikte auf; rerere wendet Ihre frühere Lösung erneut an |
| `init.defaultBranch` | `main` | Einheitlicher Standard-Branchname für neue Repositories |

Wenn ein Wert fehlt oder abweicht, bietet die CLI eine interaktive Bestätigung an (Standard **Ja**):

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

Bei Zustimmung werden sinngemäß folgende Befehle ausgeführt:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

**Nicht-interaktive Wege** (`--yes`, `--ci`, `CI=true`) schreiben niemals eine globale Git-Konfiguration. Sie geben nur einen Hinweis mit den manuellen Korrekturbefehlen aus.

`oma doctor` meldet dieselben Prüfungen unter **Git Config**, zählt Abweichungen als Probleme, stellt sie in der `--json`-Ausgabe als `gitRecommended` bereit und kann die Korrekturen interaktiv anwenden.

### 8. MCP-Konfiguration

Wenn eine Antigravity-IDE-MCP-Konfiguration vorhanden ist (`~/.gemini/antigravity/mcp_config.json`), bietet der Installer an, die Serena-MCP-Brücke zu konfigurieren:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

Bei Zustimmung wird Folgendes eingerichtet:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

Wenn Gemini-CLI-Einstellungen vorhanden sind (`~/.gemini/settings.json`), bietet der Installer ebenfalls an, Serena für die Gemini CLI im HTTP-Modus zu konfigurieren:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Abschluss

Der Installer zeigt eine Zusammenfassung aller installierten Elemente an:
- Liste der installierten Skills
- Speicherort des Skill-Verzeichnisses
- Erstellte Symlinks
- Übersprungene Elemente (falls vorhanden)

---

## Manueller Weg

Für Umgebungen, in denen die interaktive CLI nicht verfügbar ist (CI-Pipelines, eingeschränkte Shells, Unternehmensrechner).

### Schritt 1: Herunterladen und entpacken

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Schritt 2: Dateien in Ihr Projekt kopieren

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` erzeugt `.claude/`, `.codex/`, `.qwen/` und weitere Vendor-native Dateien aus `.agents/agents/` neu. Zur Laufzeit verwendet OMA den nativen Dispatch nur, wenn der Vendor der aktuellen Laufzeit mit dem Ziel-Vendor des Agenten übereinstimmt. Setups mit mehreren Vendoren funktionieren weiterhin, aber nicht passende Agenten fallen auf den externen Aufruf `oma agent spawn` zurück.

Für Qwen Code liegen die erzeugten Markdown-Definitionen in `.qwen/agents/`. Wählen Sie eine OMA-Rolle über den `subagent_type` des Agent-Tools aus, zum Beispiel `backend-engineer`. Prüfen Sie die verfügbaren Definitionen mit `/agents manage` in Qwen Code. Native Agenten verwenden denselben [Ergebnis-Lebenszyklus](./agent-results-and-resume.md) wie CLI-Spawns: `oma agent begin`, `oma agent verify` und `oma agent finish`. Verwenden Sie bei `model_preset: free` `oma agent spawn`, damit der untergeordnete Prozess die Gateway-Konfiguration erhält.

Qwen Code verwendet denselben `code-intelligence-primer` wie die anderen Vendoren. Wie Claude Code registriert es den gemeinsamen Primer bei `SessionStart` und `UserPromptSubmit`: Die Hinweise werden einmal pro Sitzung und nach einer Kompaktierung erneut eingefügt. Der Primer folgt dem konfigurierten Provider (Serena oder Gortex), enthält Hinweise zu zurückgestellten Tools (Deferred Tools) und erlaubt den nativen Fallback, wenn der Provider nicht verfügbar ist oder eine Zeitüberschreitung auftritt. Qwen fügt keine eigene Blockierung der Codesuche und keine Nachverfolgung von Provider-Ergebnissen hinzu.

Führen Sie nach einem Update der CLI `oma link qwen` aus, um die Hook-Einstellungen und den Wrapper neu zu erzeugen, und starten Sie danach eine neue Qwen-Sitzung. Tests der Hook-Ausgabe prüfen den Integrationsvertrag; sie garantieren nicht, welches Tool ein Modell auswählt.

### Schritt 3: Benutzereinstellungen konfigurieren

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### Schritt 4: Memory-Verzeichnis initialisieren

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## Verifikationscheckliste

Prüfen Sie nach der Installation (bei beiden Wegen), ob alles korrekt eingerichtet ist:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

Der Doctor-Befehl prüft:

| Prüfung | Was verifiziert wird |
|:------|:----------------|
| **CLI installations** | agy, claude, codex, qwen (Version und Verfügbarkeit) |
| **Authentication** | API-Key- oder OAuth-Status für jede CLI |
| **MCP configuration** | Serena-MCP-Server-Setup für jede CLI-Umgebung |
| **Skill status** | Welche Skills installiert und ob sie aktuell sind |

Manuelle Verifikationsbefehle:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Multi-IDE-Symlink-Struktur (SSOT-Konzept)

oh-my-agent verwendet eine Single-Source-of-Truth-Architektur (SSOT). Das `.agents/`-Verzeichnis ist der einzige Ort, an dem Skills, Workflows, Konfigurationen und Agenten-Definitionen liegen. Alle IDE-spezifischen Verzeichnisse enthalten nur Symlinks, die zurück auf `.agents/` zeigen.

### Verzeichnislayout

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### Warum Symlinks?

Wenn `oma update` `.agents/` aktualisiert, übernimmt jede darauf verweisende IDE die Änderung. Skills werden einmal gespeichert, statt pro IDE kopiert zu werden. Das Löschen von `.claude/` entfernt Ihre Skills nicht, weil die SSOT in `.agents/` erhalten bleibt. Symlinks sind außerdem klein und erzeugen saubere Git-Diffs.

---

## Sicherheitstipps und Rollback-Strategie

### Vor der Installation

1. **Aktuelle Arbeit committen.** Der Installer erstellt neue Verzeichnisse und Dateien. Ein sauberer Git-Zustand bedeutet, dass Sie mit `git checkout .` alles rückgängig machen können.
2. **Auf ein vorhandenes `.agents/`-Verzeichnis prüfen.** Falls eines von einem anderen Tool existiert, sichern Sie es zuerst. Der Installer wird es überschreiben.

### Nach der Installation

1. **Prüfen, was erstellt wurde.** Führen Sie `git status` aus, um alle neuen Dateien zu sehen. Der Installer erstellt Dateien nur in `.agents/`, `.claude/` und optional `.github/`.
2. **`.gitignore` prüfen.** In einem Git-Repository hängen `install`, `update` und `link` die Laufzeiteinträge (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`) automatisch an die `.gitignore` im Projektstamm an. Prüfen Sie, ob sie vorhanden sind. Die meisten Teams committen `.agents/` und `.claude/`, um das Setup zu teilen. Bei `.serena/` können Sie selbst entscheiden: Serena verwaltet seinen Cache über eine interne `.serena/.gitignore`, daher können Sie entweder `.serena/project.yml` (gemeinsame Projektkonfiguration) committen oder das Verzeichnis vollständig ignorieren:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### Rollback

Um oh-my-agent vollständig aus einem Projekt zu entfernen:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

Oder setzen Sie einfach mit Git zurück:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Dashboard-Einrichtung

Nach der Installation können Sie eine Echtzeitüberwachung einrichten. Vollständige Informationen finden Sie in der [Anleitung zur Dashboard-Überwachung](/docs/guide/dashboard-monitoring).

Schnelleinrichtung:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## Was der Installer im Hintergrund macht

Wenn Sie `oma` (den Installationsbefehl) ausführen, geschieht genau Folgendes:

### 1. Legacy-Migration

Der Installer prüft auf das alte `.agent/`-Verzeichnis (Singular) und migriert es, falls vorhanden, zu `.agents/` (Plural). Dies ist eine einmalige Migration für Benutzer, die von früheren Versionen aktualisieren.

### 2. Erkennung konkurrierender Tools

Der Installer scannt nach konkurrierenden Tools und bietet an, sie zu entfernen, um Konflikte zu vermeiden.

### 3. Tarball-Download

Der Installer lädt das neueste Release-Tarball aus den oh-my-agent-GitHub-Releases herunter. Dieses Tarball enthält das vollständige `.agents/`-Verzeichnis mit allen Skills, gemeinsamen Ressourcen, Workflows, Konfigurationen und Agenten-Definitionen.

### 4. Installation gemeinsamer Ressourcen

`installShared()` kopiert das `_shared/`-Verzeichnis nach `.agents/skills/_shared/`. Dazu gehören:

- `core/`: Skill-Routing, Context-Loading, Prompt-Struktur, Qualitätsprinzipien, Vendor-Erkennung und API-Verträge.
- `runtime/`: Memory-Protokoll und Ausführungsprotokolle pro Vendor.
- `conditional/`: Ressourcen, die nur bei bestimmten Bedingungen geladen werden (Qualitätsbewertung, Explorationsschleife).

### 5. Workflow-Installation

`installWorkflows()` kopiert alle Workflow-Dateien nach `.agents/workflows/`. Das sind die Definitionen für `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` und `/stack-set`.

### 6. Konfigurationsinstallation

`installConfigs()` kopiert Hilfsdateien nach `.agents/config/`, erstellt `.agents/mcp.json` und richtet die benutzereigene `.agents/oma-config.yaml` oder `.agents/oma-config.cue` ein. Bereits vorhandene Benutzerdateien bleiben erhalten, sofern nicht `--force` verwendet wird. `oma update` behält außerdem die Benutzerkonfiguration bei und hängt bei Bedarf neue Top-Level-Schlüssel aus der Vorlage an.

### 7. Skill-Installation

Für jeden ausgewählten Skill kopiert `installSkill()` das Skill-Verzeichnis nach `.agents/skills/{skill-name}/`. Wenn eine Variante ausgewählt wurde (z. B. Python für Backend), richtet der Befehl außerdem das `stack/`-Verzeichnis mit sprachspezifischen Ressourcen ein.

### 8. Vendor-Anpassungen

`installVendorAdaptations()` installiert IDE-spezifische Dateien für die ausgewählten unterstützten Vendoren:

- Agenten-Definitionen (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- Hook-Konfigurationen (`.claude/hooks/`, `.codex/hooks.json`)
- Einstellungsdateien und die gemeinsame Vendor-Integrationsdokumentation (nur `AGENTS.md`, Claude Code ≥ 2.1.277 eingeschlossen). `CLAUDE.md` und `GEMINI.md` erhalten nie einen OMA-Block; eine bestehende benutzereigene `CLAUDE.md` erhält lediglich eine `@AGENTS.md`-Importzeile, damit Claude Code `AGENTS.md` nicht überspringt

Codex schützt seine Hooks durch einen einmaligen Vertrauensschritt. Daher wird `.codex/hooks.json` erst ausgeführt, nachdem Sie die Datei einmal über den Codex-`/hooks`-Browser geprüft haben. Details finden Sie in der [Anleitung zum Codex-Hook-Vertrauen](/docs/guide/codex-hook-trust).

### 9. CLI-Symlinks

`createCliSymlinks()` erstellt Symlinks von IDE-spezifischen Verzeichnissen zur SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (falls Copilot aktiviert ist)

Vendor-native Agenten-Dateien werden von `oma link`, `oma install` oder `oma update` aus `.agents/agents/` generiert und nicht direkt als Symlinks angelegt.

### 10. Globale Workflows

`installGlobalWorkflows()` installiert Workflow-Dateien, die möglicherweise global benötigt werden (außerhalb des Projektverzeichnisses).

### 11. Empfohlene Git-Konfiguration und MCP

Wie oben im CLI-Weg beschrieben, konfigurieren `install` und `update` die empfohlenen **globalen** Git-Einstellungen (`rerere.enabled`, `init.defaultBranch`) nach interaktiver Zustimmung optional und können MCP-Einstellungen konfigurieren, sofern dies möglich ist.
