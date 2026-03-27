---
title: "Anleitung: Integration in bestehendes Projekt"
description: Vollständige Anleitung zum Hinzufügen von oh-my-agent zu einem bestehenden Projekt — CLI-Weg, manueller Weg, Verifizierung, SSOT-Symlink-Struktur und was der Installer im Detail macht.
---

# Anleitung: Integration in bestehendes Projekt

## Zwei Integrationswege

Es gibt zwei Möglichkeiten, oh-my-agent zu einem bestehenden Projekt hinzuzufügen:

1. **CLI-Weg** — `oma` (oder `npx oh-my-agent`) ausführen und den interaktiven Eingabeaufforderungen folgen. Für die meisten Benutzer empfohlen.
2. **Manueller Weg** — Dateien kopieren und Symlinks selbst konfigurieren. Nützlich für eingeschränkte Umgebungen oder benutzerdefinierte Setups.

Beide Wege führen zum selben Ergebnis: einem `.agents/`-Verzeichnis (dem SSOT) mit Symlinks, die IDE-spezifische Verzeichnisse darauf verweisen.

---

## CLI-Weg: Schritt für Schritt

### 1. CLI installieren

```bash
# Globale Installation (empfohlen)
bun install --global oh-my-agent

# Oder npx für einmalige Ausführung
npx oh-my-agent
```

Nach der globalen Installation stehen zwei Aliase zur Verfügung: `oma` und `oh-my-ag`.

### 2. Zum Projektstamm navigieren

```bash
cd /path/to/your/project
```

Der Installer erwartet, vom Projektstamm ausgeführt zu werden (wo `.git/` liegt).

### 3. Installer ausführen

```bash
oma
```

Der Standardbefehl (ohne Unterbefehl) startet den interaktiven Installer.

### 4. Projekttyp auswählen

Der Installer präsentiert diese Presets:

| Preset | Enthaltene Skills |
|:-------|:---------------|
| **All** | Jeder verfügbare Skill |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js-Skills |
| **Backend** | Python/Node.js/Rust-Backend-Skills |
| **Mobile** | Flutter/Dart-Mobile-Skills |
| **DevOps** | Terraform + CI/CD + Workflow-Skills |
| **Custom** | Individuelle Skills aus der vollständigen Liste wählen |

### 5. Backend-Sprache wählen (falls zutreffend)

Wurde ein Preset mit Backend-Skill ausgewählt, wird nach der Sprachvariante gefragt:

- **Python** — FastAPI/SQLAlchemy (Standard)
- **Node.js** — NestJS/Hono + Prisma/Drizzle
- **Rust** — Axum/Actix-web
- **Andere / Auto-Erkennung** — Später mit `/stack-set` konfigurieren

### 6. IDE-Symlinks konfigurieren

Der Installer erstellt immer Claude-Code-Symlinks (`.claude/skills/`). Existiert ein `.github/`-Verzeichnis, werden automatisch auch GitHub-Copilot-Symlinks erstellt. Andernfalls wird gefragt:

```
Auch Symlinks für GitHub Copilot erstellen? (.github/skills/)
```

### 7. Git-Rerere-Einrichtung

Der Installer prüft, ob `git rerere` (Wiederverwendung aufgezeichneter Auflösungen) aktiviert ist. Falls nicht, bietet er die globale Aktivierung an:

```
Git rerere aktivieren? (Empfohlen für Wiederverwendung von Merge-Konfliktlösungen bei Multi-Agent-Workflows)
```

Dies wird empfohlen, da Multi-Agenten-Workflows Merge-Konflikte erzeugen können, und rerere sich merkt, wie Sie diese gelöst haben, damit dieselbe Auflösung beim nächsten Mal automatisch angewendet wird.

### 8. MCP-Konfiguration

Existiert eine Antigravity-IDE-MCP-Konfiguration (`~/.gemini/antigravity/mcp_config.json`), bietet der Installer die Konfiguration der Serena-MCP-Brücke an:

```
Serena MCP mit Brücke konfigurieren? (Erforderlich für volle Funktionalität)
```

Bei Annahme wird eingerichtet:

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

Ebenso wird bei vorhandenen Gemini-CLI-Einstellungen (`~/.gemini/settings.json`) Serena für Gemini CLI im HTTP-Modus angeboten:

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

Der Installer zeigt eine Zusammenfassung aller Installationen:
- Liste der installierten Skills
- Speicherort des Skills-Verzeichnisses
- Erstellte Symlinks
- Übersprungene Elemente (falls vorhanden)

---

## Manueller Weg

Für Umgebungen, in denen die interaktive CLI nicht verfügbar ist (CI-Pipelines, eingeschränkte Shells, Firmenrechner).

### Schritt 1: Herunterladen und entpacken

```bash
# Neuestes Tarball aus der Registry herunterladen
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Prüfsumme verifizieren
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Entpacken
tar -xzf agent-skills.tar.gz
```

### Schritt 2: Dateien in Ihr Projekt kopieren

```bash
# Kern-.agents/-Verzeichnis kopieren
cp -r .agents/ /path/to/your/project/.agents/

# Claude-Code-Symlinks erstellen
mkdir -p /path/to/your/project/.claude/skills
mkdir -p /path/to/your/project/.claude/agents

# Skills verlinken (Beispiel für ein Fullstack-Projekt)
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
ln -sf ../../.agents/skills/oma-backend /path/to/your/project/.claude/skills/oma-backend
ln -sf ../../.agents/skills/oma-qa /path/to/your/project/.claude/skills/oma-qa
ln -sf ../../.agents/skills/oma-pm /path/to/your/project/.claude/skills/oma-pm

# Gemeinsame Ressourcen verlinken
ln -sf ../../.agents/skills/_shared /path/to/your/project/.claude/skills/_shared

# Workflow-Router verlinken
for workflow in .agents/workflows/*.md; do
  name=$(basename "$workflow" .md)
  ln -sf ../../.agents/workflows/"$name".md /path/to/your/project/.claude/skills/"$name".md
done

# Agenten-Definitionen verlinken
for agent in .agents/agents/*.md; do
  name=$(basename "$agent")
  ln -sf ../../.agents/agents/"$name" /path/to/your/project/.claude/agents/"$name"
done
```

### Schritt 3: Benutzereinstellungen konfigurieren

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/config/user-preferences.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
default_cli: gemini

agent_cli_mapping:
  frontend: gemini
  backend: gemini
  mobile: gemini
  qa: gemini
  debug: gemini
  pm: gemini
EOF
```

### Schritt 4: Memory-Verzeichnis initialisieren

```bash
oma memory:init
# Oder manuell:
mkdir -p /path/to/your/project/.serena/memories
```

---

## Verifikationscheckliste

Nach der Installation (bei beiden Wegen) prüfen, ob alles korrekt eingerichtet ist:

```bash
# Doctor-Befehl für vollständigen Gesundheitscheck ausführen
oma doctor

# Ausgabeformat für CI prüfen
oma doctor --json
```

Der Doctor-Befehl prüft:

| Prüfung | Was verifiziert wird |
|:------|:----------------|
| **CLI-Installationen** | gemini, claude, codex, qwen — Version und Verfügbarkeit |
| **Authentifizierung** | API-Schlüssel oder OAuth-Status für jede CLI |
| **MCP-Konfiguration** | Serena-MCP-Server-Setup für jede CLI-Umgebung |
| **Skill-Status** | Welche Skills installiert sind und ob sie aktuell sind |

Manuelle Verifikationsbefehle:

```bash
# .agents/-Verzeichnis existiert
ls -la .agents/

# Skills sind installiert
ls .agents/skills/

# Symlinks zeigen auf korrekte Ziele
ls -la .claude/skills/

# Konfiguration existiert
cat .agents/config/user-preferences.yaml

# Memory-Verzeichnis
ls .serena/memories/ 2>/dev/null || echo "Memory nicht initialisiert"

# Version prüfen
cat .agents/skills/_version.json 2>/dev/null
```

---

## Multi-IDE-Symlink-Struktur (SSOT-Konzept)

oh-my-agent verwendet eine Single-Source-of-Truth-Architektur (SSOT). Das `.agents/`-Verzeichnis ist der einzige Ort, an dem Skills, Workflows, Konfigurationen und Agenten-Definitionen gespeichert sind. Alle IDE-spezifischen Verzeichnisse enthalten nur Symlinks, die auf `.agents/` zurückverweisen.

### Verzeichnislayout

```
your-project/
  .agents/                          # SSOT — die echten Dateien leben hier
    agents/                         # Agenten-Definitionsdateien
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Konfiguration
      user-preferences.yaml
    mcp.json                        # MCP-Server-Konfiguration
    plan.json                       # Aktueller Plan (generiert durch /plan)
    skills/                         # Installierte Skills
      _shared/                      # Geteilte Ressourcen über alle Skills
        core/                       # Kernprotokolle und -referenzen
        runtime/                    # Laufzeit-Ausführungsprotokolle
        conditional/                # Bedingt geladene Ressourcen
      oma-frontend/                 # Frontend-Skill
      oma-backend/                  # Backend-Skill
      oma-qa/                       # QA-Skill
      ...
    workflows/                      # Workflow-Definitionen
      orchestrate.md
      coordinate.md
      ultrawork.md
      plan.md
      ...
    results/                        # Agenten-Ausführungsergebnisse
  .claude/                          # Claude Code — nur Symlinks
    skills/                         # -> .agents/skills/* und .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — nur Symlinks (optional)
    skills/                         # -> .agents/skills/*
  .serena/                          # MCP-Memory-Speicher
    memories/                       # Laufzeit-Memory-Dateien
    metrics.json                    # Produktivitätsmetriken
```

### Warum Symlinks?

- **Ein Update, alle IDEs profitieren.** Wenn `oma update` `.agents/` aktualisiert, übernimmt jede IDE die Änderungen automatisch.
- **Keine Duplizierung.** Skills werden einmal gespeichert, nicht pro IDE kopiert.
- **Sicheres Entfernen.** Das Löschen von `.claude/` zerstört Ihre Skills nicht. Das SSOT in `.agents/` bleibt intakt.
- **Git-freundlich.** Symlinks sind klein und erzeugen saubere Diffs.

---

## Sicherheitstipps und Rollback-Strategie

### Vor der Installation

1. **Aktuelle Arbeit committen.** Der Installer erstellt neue Verzeichnisse und Dateien. Ein sauberer Git-Zustand bedeutet, dass Sie mit `git checkout .` alles rückgängig machen können.
2. **Auf vorhandenes `.agents/`-Verzeichnis prüfen.** Falls eines von einem anderen Tool existiert, zuerst sichern. Der Installer wird es überschreiben.

### Nach der Installation

1. **Prüfen, was erstellt wurde.** `git status` ausführen, um alle neuen Dateien zu sehen. Der Installer erstellt Dateien nur in `.agents/`, `.claude/` und optional `.github/`.
2. **Selektiv zur `.gitignore` hinzufügen.** Die meisten Teams committen `.agents/` und `.claude/`, um das Setup zu teilen. Aber `.serena/` (Laufzeit-Memory) und `.agents/results/` (Ausführungsergebnisse) sollten gitignored werden:

```gitignore
# oh-my-agent Laufzeitdateien
.serena/
.agents/results/
.agents/state/
```

### Rollback

Um oh-my-agent vollständig aus einem Projekt zu entfernen:

```bash
# SSOT-Verzeichnis entfernen
rm -rf .agents/

# IDE-Symlinks entfernen
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # falls erstellt

# Laufzeitdateien entfernen
rm -rf .serena/
```

Oder einfach mit Git zurücksetzen:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Dashboard-Einrichtung

Nach der Installation können Sie Echtzeit-Überwachung einrichten. Weitere Details finden Sie in der [Dashboard-Überwachungsanleitung](/de/guide/dashboard-monitoring).

Schnelleinrichtung:

```bash
# Terminal-Dashboard (überwacht .serena/memories/ auf Änderungen)
oma dashboard

# Web-Dashboard (browserbasiert, http://localhost:9847)
oma dashboard:web
```

---

## Was der Installer im Detail macht

Wenn Sie `oma` (den Installationsbefehl) ausführen, passiert Folgendes:

### 1. Legacy-Migration

Der Installer prüft auf das alte `.agent/`-Verzeichnis (Singular) und migriert es zu `.agents/` (Plural), falls gefunden. Dies ist eine einmalige Migration für Benutzer, die von früheren Versionen aktualisieren.

### 2. Erkennung konkurrierender Tools

Der Installer scannt nach konkurrierenden Tools und bietet deren Entfernung an, um Konflikte zu vermeiden.

### 3. Tarball-Download

Der Installer lädt das neueste Release-Tarball aus den oh-my-agent GitHub-Releases herunter. Dieses Tarball enthält das vollständige `.agents/`-Verzeichnis mit allen Skills, gemeinsamen Ressourcen, Workflows, Konfigurationen und Agenten-Definitionen.

### 4. Installation gemeinsamer Ressourcen

`installShared()` kopiert das `_shared/`-Verzeichnis nach `.agents/skills/_shared/`. Dies umfasst:

- `core/` — Skill-Routing, Context-Loading, Prompt-Struktur, Qualitätsprinzipien, Vendor-Erkennung, API-Verträge.
- `runtime/` — Memory-Protokoll, Ausführungsprotokolle pro Vendor.
- `conditional/` — Ressourcen, die nur bei bestimmten Bedingungen geladen werden (Qualitätsbewertung, Explorationsschleife).

### 5. Workflow-Installation

`installWorkflows()` kopiert alle Workflow-Dateien nach `.agents/workflows/`. Dies sind die Definitionen für `/orchestrate`, `/coordinate`, `/ultrawork`, `/plan`, `/exec-plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/commit`, `/setup`, `/tools` und `/stack-set`.

### 6. Konfigurationsinstallation

`installConfigs()` kopiert Standard-Konfigurationsdateien nach `.agents/config/`, einschließlich `user-preferences.yaml` und `mcp.json`. Existieren diese Dateien bereits, werden sie beibehalten (nicht überschrieben), es sei denn `--force` wird verwendet.

### 7. Skill-Installation

Für jeden ausgewählten Skill kopiert `installSkill()` das Skill-Verzeichnis nach `.agents/skills/{skill-name}/`. Wurde eine Variante ausgewählt (z. B. Python für Backend), wird auch das `stack/`-Verzeichnis mit sprachspezifischen Ressourcen eingerichtet.

### 8. Vendor-Anpassungen

`installVendorAdaptations()` installiert IDE-spezifische Dateien für alle unterstützten Anbieter (Claude, Codex, Gemini, Qwen):

- Agenten-Definitionen (`.claude/agents/*.md`)
- Hook-Konfigurationen (`.claude/hooks/`)
- Einstellungsdateien
- CLAUDE.md-Projektanweisungen

### 9. CLI-Symlinks

`createCliSymlinks()` erstellt Symlinks von IDE-spezifischen Verzeichnissen zum SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.claude/agents/{agent}.md` -> `../../.agents/agents/{agent}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (falls Copilot aktiviert)

### 10. Globale Workflows

`installGlobalWorkflows()` installiert Workflow-Dateien, die möglicherweise global benötigt werden (außerhalb des Projektverzeichnisses).

### 11. Git-Rerere + MCP-Konfiguration

Wie oben im CLI-Weg beschrieben, konfiguriert der Installer optional git rerere und MCP-Einstellungen.
