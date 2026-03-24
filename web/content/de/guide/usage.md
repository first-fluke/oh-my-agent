---
title: Nutzungsanleitung
description: Vollständige Nutzungsanleitung mit Beispielen, Workflows, Dashboard-Operationen und Fehlerbehebung.
---

# Verwendung der Antigravity Multi-Agent Skills

## Schnellstart

1. **In Antigravity IDE öffnen**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **Skills werden automatisch erkannt.** Antigravity scannt `.agents/skills/` und indiziert alle verfügbaren Skills.

3. **Chatten Sie in der IDE.** Beschreiben Sie, was Sie bauen möchten.

---

## Verwendungsbeispiele

### Beispiel 1: Einfache Single-Domain-Aufgabe

**Sie tippen:**
```
"Erstelle eine Login-Formular-Komponente mit E-Mail- und Passwortfeldern mit Tailwind CSS"
```

**Was passiert:**
- Sie rufen `oma-frontend` über /command oder Agent-Skills-Feld auf
- Der Skill wird bei Bedarf geladen (Progressive Disclosure)
- Sie erhalten eine React-Komponente mit TypeScript, Tailwind, Formularvalidierung

### Beispiel 2: Komplexes Multi-Domain-Projekt

**Sie tippen:**
```
"Baue eine TODO-App mit Benutzerauthentifizierung"
```

**Was passiert:**

1. **Workflow Guide aktiviert** — erkennt Multi-Domain-Komplexität
2. **PM Agent plant** — erstellt Task-Breakdown mit Prioritäten
3. **Sie spawnen Agenten via CLI**:
   ```bash
   oma agent:spawn backend "JWT-Authentifizierungs-API" session-01 &
   oma agent:spawn frontend "Login- und TODO-UI" session-01 &
   wait
   ```
4. **Agenten arbeiten parallel** — speichern Outputs in Knowledge Base
5. **Sie koordinieren** — überprüfen `.agents/results/` auf Konsistenz
6. **QA Agent überprüft** — Sicherheits-/Performance-Audit
7. **Korrigieren & iterieren** — Agenten mit Korrekturen neu spawnen

### Beispiel 3: Bug-Behebung

**Sie tippen:**
```
"Es gibt einen Bug — Klick auf Login zeigt 'Cannot read property map of undefined'"
```

**Was passiert:**

1. **oma-debug aktiviert** — analysiert Fehler
2. **Grundursache gefunden** — Komponente mappt über `todos` bevor Daten geladen sind
3. **Fix bereitgestellt** — Loading-States und Null-Checks hinzugefügt
4. **Regressionstest geschrieben** — stellt sicher, dass Bug nicht zurückkehrt
5. **Ähnliche Patterns gefunden** — behebt proaktiv 3 weitere Komponenten

### Beispiel: Designsystem erstellen

**Sie tippen:**
```
"Entwirf eine dunkle Premium-Landingpage für mein SaaS-Produkt"
```

**Was passiert:**

1. **oma-design wird aktiviert** — prüft `.design-context.md`
2. **Kontext gesammelt** — fragt nach Zielgruppe, Marke, ästhetischer Richtung
3. **Prompt verbessert** — vage Anfrage wird in Abschnitt-für-Abschnitt-Spezifikation umgewandelt
4. **2-3 Richtungen vorgeschlagen** — Farb-, Typografie-, Layout-, Bewegungsoptionen
5. **DESIGN.md generiert** — 6-Abschnitt-Designsystem + Tokens
6. **Audit durchgeführt** — Responsive, WCAG, Nielsen-Heuristiken, AI-Slop-Prüfung
7. **Übergabe** — bereit für oma-frontend-Implementierung

### Beispiel 4: CLI-basierte parallele Ausführung

```bash
# Einzelner Agent (Workspace wird automatisch erkannt)
oma agent:spawn backend "JWT-Auth-API implementieren" session-01

# Parallele Agenten
oma agent:spawn backend "Auth-API implementieren" session-01 &
oma agent:spawn frontend "Login-Formular erstellen" session-01 &
oma agent:spawn mobile "Auth-Screens bauen" session-01 &
wait
```

**Echtzeit-Überwachung:**
```bash
# Terminal (separates Terminalfenster)
bunx oh-my-agent dashboard

# Oder Browser
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Echtzeit-Dashboards

### Terminal-Dashboard

```bash
bunx oh-my-agent dashboard
```

Beobachtet `.serena/memories/` mit `fswatch` (macOS) oder `inotifywait` (Linux). Zeigt eine Live-Tabelle mit Session-Status, Agent-Zuständen, Turns und letzter Aktivität. Aktualisiert automatisch, wenn Memory-Dateien sich ändern.

**Voraussetzungen:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Web-Dashboard

```bash
npm install          # nur beim ersten Mal
bunx oh-my-agent dashboard:web
```

Öffnen Sie `http://localhost:9847` in Ihrem Browser. Features:

- **Echtzeit-Updates** via WebSocket (event-driven, kein Polling)
- **Auto-Reconnect** falls die Verbindung abbricht
- **Serena-themed UI** mit lila Akzentfarben
- **Session-Status** — ID und running/completed/failed-Status
- **Agent-Tabelle** — Name, Status (mit farbigen Punkten), Turn-Count, Task-Beschreibung
- **Aktivitätslog** — letzte Änderungen aus Progress- und Result-Dateien

Der Server beobachtet `.serena/memories/` mit chokidar mit Debounce (100ms). Nur geänderte Dateien lösen Lesevorgänge aus — kein vollständiger Re-Scan.

---

## Kernkonzepte

### Progressive Disclosure

Skills werden explizit über /command oder das Agent-Skills-Feld aufgerufen. Nur der benötigte Skill wird in den Kontext geladen.

### Token-optimiertes Skill-Design

Jeder Skill verwendet eine zweistufige Architektur für maximale Token-Effizienz:
- **SKILL.md** (~40 Zeilen): Identität, Routing, Kernregeln — sofort geladen
- **resources/**: Ausführungsprotokolle, Beispiele, Checklisten, Error-Playbooks — On-Demand geladen

Gemeinsame Ressourcen liegen in `_shared/` (kein Skill) und werden von allen Agenten referenziert:
- Chain-of-Thought-Ausführungsprotokolle mit 4-Schritt-Workflow
- Few-Shot-Ein-/Ausgabebeispiele für Mid-Tier-Modell-Anleitung
- Error-Recovery-Playbooks mit "3 Strikes"-Eskalation
- Reasoning-Templates für strukturierte mehrstufige Analyse
- Context-Budget-Management für Flash/Pro-Modell-Tiers
- Automatisierte Verifikation via `verify.sh`
- Sitzungsübergreifende Lessons-Learned-Akkumulation

### CLI-Agent-Spawning

Verwenden Sie `oma agent:spawn`, um Agenten via CLI auszuführen. Respektiert `agent_cli_mapping` in `user-preferences.yaml`, um die passende CLI (gemini, claude, codex, qwen) pro Agent-Typ auszuwählen. Workspace wird aus gängigen Monorepo-Konventionen automatisch erkannt oder kann explizit mit `-w` gesetzt werden.

### Knowledge Base

Agent-Outputs gespeichert in `.agents/results/`. Enthält Pläne, Code, Reports und Koordinationsnotizen.

### Serena Memory

Strukturierter Laufzeit-Status in `.serena/memories/`. Der Orchestrator schreibt Session-Info, Task-Boards, Pro-Agent-Fortschritt und Ergebnisse. Dashboards beobachten diese Dateien zur Überwachung.

### Workspaces

Agenten können in separaten Verzeichnissen arbeiten, um Konflikte zu vermeiden. Workspace wird aus gängigen Monorepo-Konventionen automatisch erkannt:
```
./apps/api   or ./backend   → Backend Agent Workspace
./apps/web   or ./frontend  → Frontend Agent Workspace
./apps/mobile or ./mobile   → Mobile Agent Workspace
```

---

## Verfügbare Skills

| Skill | Anwendungsfall | Output |
|-------|--------------------------|--------|
| oma-coordination | Komplexe Multi-Domain-Projekte | Schritt-für-Schritt-Agent-Koordination |
| oma-pm | "plane das", "schlüssele auf" | `.agents/plan.json` |
| oma-frontend | UI, Komponenten, Styling | React-Komponenten, Tests |
| oma-backend | APIs, Datenbanken, Auth | API-Endpoints, Modelle, Tests |
| oma-mobile | Mobile Apps, iOS/Android | Flutter-Screens, State-Management |
| oma-brainstorm | Ideenfindung, Konzepterkundung | Design-Dokument |
| oma-db | Datenbank, Schema, ERD, Migration | Schema-Design, Query-Tuning |
| oma-dev-workflow | CI/CD, Git Hooks, Monorepo-Setup | Workflow-Konfigurationen, Automatisierung |
| oma-tf-infra | Terraform, Cloud-Infrastruktur | IaC-Module, State-Management |
| oma-translator | Übersetzung, mehrsprachige Inhalte | Tonerhaltende Übersetzung |
| oma-qa | "Sicherheit prüfen", "Audit" | QA-Report mit priorisierten Fixes |
| oma-debug | Bug-Reports, Fehlermeldungen | Gefixter Code, Regressionstests |
| oma-orchestrator | CLI Sub-Agent-Ausführung | Ergebnisse in `.agents/results/` |
| oma-commit | "commit", "Änderungen speichern" | Git-Commits (auto-split nach Feature) |

---

## Workflow-Befehle

Tippen Sie diese in der Antigravity IDE, um schrittweise Workflows auszulösen:

| Befehl | Beschreibung |
|--------|--------------|
| `/brainstorm` | Design-First-Ideenfindung — Absicht, Einschränkungen und Ansätze erkunden |
| `/coordinate` | Multi-Agent-Orchestrierung via CLI mit schrittweiser Anleitung |
| `/deepinit` | Projekt-Harness mit AGENTS.md und ARCHITECTURE.md initialisieren |
| `/exec-plan` | Ausführungspläne als Repository-Artefakte erstellen und verfolgen |
| `/orchestrate` | Automatisierte CLI-basierte parallele Agent-Ausführung |
| `/plan` | PM Task-Zerlegung mit API-Verträgen |
| `/review` | Vollständige QA-Pipeline (Sicherheit, Performance, Accessibility, Code-Qualität) |
| `/debug` | Strukturierte Bug-Behebung (reproduzieren → diagnostizieren → fixen → Regressionstest) |
| `/setup` | Projekt-Setup und Konfiguration |
| `/tools` | MCP-Tool-Verwaltung |
| `/ultrawork` | Hochwertige 5-Phasen-Entwicklung mit 11 Review-Gates |
| `/stack-set` | Backend-Sprachstack von oma-backend setzen (Python, Node.js, Rust) |

Diese sind getrennt von **Skills** (aufgerufen über /command oder Agent-Skills-Feld). Workflows geben Ihnen explizite Kontrolle über mehrstufige Prozesse.

---

## Typische Workflows

### Workflow A: Einzelner Skill

```
Sie: "Erstelle eine Button-Komponente"
  → Antigravity lädt oma-frontend
  → Erhalten Sie Komponente sofort
```

### Workflow B: Multi-Agent-Projekt (Auto)

```
Sie: "Baue eine TODO-App mit Authentifizierung"
  → /coordinate verwenden um oma-coordination zu starten
  → PM Agent erstellt Plan
  → Sie spawnen Agenten via CLI (oma agent:spawn)
  → Agenten arbeiten parallel
  → QA Agent überprüft
  → Issues beheben, iterieren
```

### Workflow B-2: Multi-Agent-Projekt (Explizit)

```
Sie: /coordinate
  → Schrittweise geführter Workflow
  → PM-Planung → Plan-Review → Agent-Spawning → Monitoring → QA-Review
```

### Workflow C: Bug-Behebung

```
Sie: "Login-Button wirft TypeError"
  → oma-debug aktiviert
  → Root-Cause-Analyse
  → Fix + Regressionstest
  → Ähnliche Patterns geprüft
```

### Workflow D: CLI-Orchestrierung mit Dashboard

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "task" session-01 &
            oma agent:spawn frontend "task" session-01 &
Browser:    http://localhost:9847 → Echtzeit-Status
```

---

## Tipps

1. **Seien Sie spezifisch** — "Baue eine TODO-App mit JWT-Auth, React-Frontend, Express-Backend" ist besser als "mache eine App"
2. **Verwenden Sie CLI-Spawning** für Multi-Domain-Projekte — versuchen Sie nicht, alles in einem Chat zu machen
3. **Überprüfen Sie Knowledge Base** — prüfen Sie `.agents/results/` auf API-Konsistenz
4. **Iterieren Sie mit Re-Spawns** — verfeinern Sie Anweisungen, starten Sie nicht von vorne
5. **Verwenden Sie Dashboards** — `bunx oh-my-agent dashboard` oder `bunx oh-my-agent dashboard:web` zur Überwachung von Orchestrator-Sessions
6. **Separate Workspaces** — weisen Sie jedem Agenten sein eigenes Verzeichnis zu

---

## Fehlerbehebung

| Problem | Lösung |
|---------|--------|
| Skills laden nicht | `antigravity open .`, `.agents/skills/` prüfen, IDE neu starten |
| CLI nicht gefunden | `which gemini` / `which claude` prüfen, fehlende CLIs installieren |
| Inkompatible Agent-Outputs | Beide in Knowledge Base überprüfen, mit Korrekturen neu spawnen |
| Dashboard: "No agents" | Memory-Dateien noch nicht erstellt, Orchestrator zuerst ausführen |
| Web-Dashboard startet nicht | `npm install` ausführen, um chokidar und ws zu installieren |
| fswatch nicht gefunden | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| QA-Report hat 50+ Issues | Fokus auf CRITICAL/HIGH zuerst, Rest für später dokumentieren |

---

## CLI-Befehle

```bash
bunx oh-my-agent                # Interaktiver Skill-Installer
bunx oh-my-agent doctor         # Setup überprüfen & fehlende Skills reparieren
bunx oh-my-agent doctor --json  # JSON-Output für CI/CD
bunx oh-my-agent update         # Skills auf neueste Version aktualisieren
bunx oh-my-agent stats          # Produktivitätsmetriken anzeigen
bunx oh-my-agent stats --reset  # Metriken zurücksetzen
bunx oh-my-agent retro          # Session-Retrospektive (Learnings & nächste Schritte)
bunx oh-my-agent dashboard      # Terminal-Echtzeit-Dashboard
bunx oh-my-agent dashboard:web  # Web-Dashboard (http://localhost:9847)
bunx oh-my-agent help           # Hilfe anzeigen
```

---

## Für Entwickler (Integrationsleitfaden)

Wenn Sie diese Skills in Ihr bestehendes Antigravity-Projekt integrieren möchten, siehe [AGENT_GUIDE.md](../AGENT_GUIDE.md) für:
- Schnelle 3-Schritt-Integration
- Vollständige Dashboard-Integration
- Skills für Ihren Tech-Stack anpassen
- Fehlerbehebung und Best Practices

---

**Chatten Sie einfach in der Antigravity IDE.** Zur Überwachung verwenden Sie die Dashboards. Für CLI-Ausführung verwenden Sie die Orchestrator-Scripts. Zur Integration in Ihr bestehendes Projekt siehe [AGENT_GUIDE.md](../AGENT_GUIDE.md).
