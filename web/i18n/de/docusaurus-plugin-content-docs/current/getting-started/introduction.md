---
title: Einführung
description: Ein umfassender Überblick über oh-my-agent — das Multi-Agenten-Orchestrierungs-Framework, das KI-Coding-Assistenten in spezialisierte Engineering-Teams mit 14 Domain-Agenten, progressivem Skill-Loading und IDE-übergreifender Portabilität verwandelt.
---

# Einführung

oh-my-agent ist ein Multi-Agenten-Orchestrierungs-Framework für KI-gestützte IDEs und CLI-Tools. Anstatt sich für alles auf einen einzelnen KI-Assistenten zu verlassen, verteilt oh-my-agent die Arbeit auf 14 spezialisierte Agenten — jeder ist einer realen Engineering-Teamrolle nachempfunden, mit eigenem Tech-Stack-Wissen, Ausführungsprotokollen, Fehler-Playbooks und Qualitätschecklisten.

Das gesamte System befindet sich in einem portablen `.agents/`-Verzeichnis innerhalb Ihres Projekts. Wechseln Sie zwischen Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor oder einem anderen unterstützten Tool — Ihre Agentenkonfiguration reist mit Ihrem Code.

---

## Das Multi-Agenten-Paradigma

Herkömmliche KI-Coding-Assistenten arbeiten als Generalisten. Sie behandeln Frontend, Backend, Datenbank, Sicherheit und Infrastruktur mit demselben Prompt-Kontext und demselben Expertisegrad. Dies führt zu:

- **Kontextverwässerung** — das Laden von Wissen für jede Domäne verschwendet das Kontextfenster
- **Inkonsistente Qualität** — ein Generalist kann in keiner einzelnen Domäne mit einem Spezialisten mithalten
- **Keine Koordination** — komplexe Features, die mehrere Domänen umfassen, werden sequenziell bearbeitet

oh-my-agent löst dies durch Spezialisierung:

1. **Jeder Agent kennt eine Domäne tiefgehend.** Der Frontend-Agent kennt React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite-Architektur. Der Backend-Agent kennt das Repository-Service-Router-Muster, parametrisierte Abfragen, JWT-Authentifizierung. Sie überschneiden sich nicht.

2. **Agenten laufen parallel.** Während der Backend-Agent Ihre API erstellt, baut der Frontend-Agent bereits die Benutzeroberfläche. Der Orchestrator koordiniert über gemeinsamen Speicher.

3. **Qualität ist eingebaut.** Jeder Agent verfügt über eine domänenspezifische Checkliste und ein Fehler-Playbook. Charter Preflight erkennt Scope-Creep, bevor Code geschrieben wird. QA-Review ist ein erstklassiger Schritt, kein Nachgedanke.

---

## Alle 14 Agenten

### Ideenfindung und Planung

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-brainstorm** | Design-first-Ideenfindung | Erkundet Benutzerabsichten, schlägt 2-3 Ansätze mit Abwägungsanalyse vor, erstellt Designdokumente, bevor Code geschrieben wird. 6-Phasen-Workflow: Kontext, Fragen, Ansätze, Design, Dokumentation, Überleitung zu `/plan`. |
| **oma-pm** | Produktmanager | Zerlegt Anforderungen in priorisierte Aufgaben mit Abhängigkeiten. Definiert API-Verträge. Gibt `.agents/results/plan-{sessionId}.json` und `task-board.md` aus. Unterstützt ISO-21500-Konzepte, ISO-31000-Risikorahmen, ISO-38500-Governance. |

### Implementierung

| Agent | Rolle | Tech-Stack und Ressourcen |
|-------|------|----------------------|
| **oma-frontend** | UI/UX-Spezialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite-Architektur. Bibliotheken: luxon (Datum), ahooks (Hooks), es-toolkit (Hilfsfunktionen), Jotai (Client-Status), TanStack Query (Server-Status), @tanstack/react-form + Zod (Formulare), better-auth (Authentifizierung), nuqs (URL-Status). Ressourcen: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | API- und Server-Spezialist | Clean Architecture (Router-Service-Repository-Modelle). Stack-agnostisch — erkennt Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET aus Projektmanifesten. JWT + bcrypt für Authentifizierung. Ressourcen: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Unterstützt `/stack-set` zur Generierung sprachspezifischer `stack/`-Referenzen. |
| **oma-mobile** | Plattformübergreifender Mobile-Spezialist | Flutter, Dart, Riverpod/Bloc für Zustandsverwaltung, Dio mit Interceptors für API-Aufrufe, GoRouter für Navigation. Clean Architecture: Domäne-Daten-Präsentation. Material Design 3 (Android) + iOS HIG. 60-fps-Ziel. Ressourcen: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Datenbankarchitekt | SQL-, NoSQL- und Vektordatenbank-Modellierung. Schema-Design (3NF-Standard), Normalisierung, Indizierung, Transaktionen, Kapazitätsplanung, Backup-Strategie. Unterstützt ISO-27001/27002/22301-bewusstes Design. Ressourcen: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-design** | Design-System-Spezialist | Erstellt DESIGN.md mit Tokens, Typografie, Farbsystemen, Motion-Design (motion/react, GSAP, Three.js), responsive-first-Layouts, WCAG-2.2-Konformität. 7-Phasen-Workflow: Setup, Extraktion, Anreicherung, Vorschlag, Generierung, Audit, Übergabe. Setzt Anti-Patterns durch (kein "KI-Kitsch"). Optionale Stitch-MCP-Integration. Ressourcen: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, plus `reference/`-Verzeichnis mit Leitfäden für Typografie, Farbe, Raum, Bewegung, Responsivität, Komponenten, Barrierefreiheit und Shader. |

### Infrastruktur und DevOps

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-Code | Multi-Cloud-Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first-Authentifizierung, minimale IAM-Berechtigungen, Policy-as-Code (OPA/Sentinel), Kostenoptimierung. Unterstützt ISO/IEC-42001-KI-Kontrollen, ISO-22301-Kontinuität, ISO/IEC/IEEE-42010-Architekturdokumentation. Ressourcen: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Monorepo-Aufgabenautomatisierung | mise Task Runner, CI/CD-Pipelines, Datenbankmigrationen, Release-Koordination, Git-Hooks, Pre-Commit-Validierung. Ressourcen: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Qualität und Debugging

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-qa** | Qualitätssicherung | Sicherheitsaudit (OWASP Top 10), Performance-Analyse, Barrierefreiheit (WCAG 2.1 AA), Code-Qualitäts-Review. Schweregrade: CRITICAL/HIGH/MEDIUM/LOW mit Datei:Zeile und Behebungscode. Unterstützt ISO/IEC-25010-Qualitätsmerkmale und ISO/IEC-29119-Testausrichtung. Ressourcen: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Bug-Diagnose und -Behebung | Reproduktion-zuerst-Methodik. Grundursachenanalyse, minimale Korrekturen, obligatorische Regressionstests, Scan nach ähnlichen Mustern. Verwendet Serena MCP zur Symbolverfolgung. Ressourcen: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Lokalisierung, Koordination und Git

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-translator** | Kontextbewusste Übersetzung | 4-Stufen-Übersetzungsmethode: Quelle analysieren, Bedeutung extrahieren, in Zielsprache rekonstruieren, Verifizieren. Bewahrt Ton, Register und Fachterminologie. Anti-KI-Mustererkennung. Unterstützt Stapelübersetzung (i18n-Dateien). Optionaler 7-Stufen-verfeinerter Modus für Publikationsqualität. Ressourcen: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Automatisierter Multi-Agenten-Koordinator | Startet CLI-Subagenten parallel, koordiniert über MCP-Memory, überwacht Fortschritt, führt Verifikationsschleifen durch. Konfigurierbar: MAX_PARALLEL (Standard 3), MAX_RETRIES (Standard 2), POLL_INTERVAL (Standard 30 s). Enthält Agenten-zu-Agenten-Review-Schleife und Clarification-Debt-Überwachung. Ressourcen: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Conventional Commits | Analysiert Änderungen, bestimmt Typ/Scope, teilt nach Feature auf wenn angemessen, generiert Commit-Nachrichten im Conventional-Commits-Format. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## Progressives Offenlegungsmodell

oh-my-agent verwendet eine Zwei-Schichten-Skill-Architektur, um eine Erschöpfung des Kontextfensters zu verhindern:

**Schicht 1 — SKILL.md (~800 Bytes, immer geladen):**
Enthält die Identität des Agenten, Routing-Bedingungen, Kernregeln und "Wann verwenden / Wann NICHT verwenden"-Hinweise. Dies ist alles, was geladen wird, wenn der Agent nicht aktiv arbeitet.

**Schicht 2 — resources/ (bedarfsgesteuert geladen):**
Enthält Ausführungsprotokolle, Tech-Stack-Referenzen, Code-Snippets, Fehler-Playbooks, Checklisten und Beispiele. Diese werden nur geladen, wenn der Agent für eine Aufgabe aufgerufen wird, und selbst dann nur die Ressourcen, die für den spezifischen Aufgabentyp relevant sind (basierend auf der Schwierigkeitsbewertung und der Aufgaben-Ressourcen-Zuordnung in `context-loading.md`).

Dieses Design spart etwa 75 % der Tokens im Vergleich zum Laden aller Ressourcen im Voraus. Bei Flash-Tier-Modellen (128K Kontext) beträgt das Gesamtressourcenbudget etwa 3.100 Tokens — nur 2,4 % des Kontextfensters.

---

## .agents/ — Die einzige Wahrheitsquelle (SSOT)

Alles, was oh-my-agent benötigt, befindet sich im `.agents/`-Verzeichnis:

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 15 Skill-Verzeichnisse (14 Agenten + _shared)
│   ├── _shared/            # Kernressourcen für alle Agenten
│   └── oma-{agent}/        # Pro-Agent SKILL.md + resources/
├── workflows/              # 14 Workflow-Definitionen
├── agents/                 # 7 Subagenten-Definitionen
├── results/plan-{sessionId}.json               # Generierter Plan-Output
├── state/                  # Aktive Workflow-Zustandsdateien
├── results/                # Agenten-Ergebnisdateien
└── mcp.json                # MCP-Server-Konfiguration
```

Das `.claude/`-Verzeichnis existiert nur als IDE-Integrationsschicht — es enthält Symlinks, die auf `.agents/` zurückverweisen, sowie Hooks für die Keyword-Erkennung und die HUD-Statuszeile. Das `.serena/memories/`-Verzeichnis hält den Laufzeitzustand während Orchestrierungssitzungen.

Diese Architektur bedeutet, dass Ihre Agentenkonfiguration:
- **Portabel** ist — IDE-Wechsel ohne Neukonfiguration
- **Versionskontrolliert** ist — `.agents/` zusammen mit Ihrem Code committen
- **Teilbar** ist — Teammitglieder erhalten dasselbe Agenten-Setup

---

## Unterstützte IDEs und CLI-Tools

oh-my-agent funktioniert mit jeder KI-gestützten IDE oder CLI, die Skill-/Prompt-Loading unterstützt:

| Tool | Integrationsmethode | Parallele Agenten |
|------|-------------------|----------------|
| **Claude Code** | Native Skills + Agent-Tool | Task-Tool für echte Parallelität |
| **Gemini CLI** | Skills automatisch geladen aus `.agents/skills/` | `oma agent:spawn` |
| **Codex CLI** | Skills automatisch geladen | Modellvermittelte parallele Anfragen |
| **Antigravity IDE** | Skills automatisch geladen | `oma agent:spawn` |
| **Cursor** | Skills über `.cursor/`-Integration | Manuelles Starten |
| **OpenCode** | Skills-Loading | Manuelles Starten |

Die Agentenstart-Mechanik passt sich automatisch an jeden Vendor über das Vendor-Erkennungsprotokoll an, das vendor-spezifische Marker prüft (z. B. das `Agent`-Tool für Claude Code, `apply_patch` für Codex CLI).

---

## Skill-Routing-System

Wenn Sie einen Prompt senden, bestimmt oh-my-agent mithilfe der Skill-Routing-Karte (`.agents/skills/_shared/core/skill-routing.md`), welcher Agent ihn bearbeitet:

| Domänen-Keywords | Weitergeleitet an |
|----------------|-----------|
| API, Endpunkt, REST, GraphQL, Datenbank, Migration | oma-backend |
| Auth, JWT, Login, Registrierung, Passwort | oma-backend |
| UI, Komponente, Seite, Formular, Bildschirm (Web) | oma-frontend |
| Style, Tailwind, Responsive, CSS | oma-frontend |
| Mobil, iOS, Android, Flutter, React Native, App | oma-mobile |
| Bug, Fehler, Absturz, defekt, langsam | oma-debug |
| Review, Sicherheit, Performance, Barrierefreiheit | oma-qa |
| UI-Design, Design-System, Landingpage, DESIGN.md | oma-design |
| Brainstorm, Ideenfindung, Erkunden, Idee | oma-brainstorm |
| Plan, Aufschlüsselung, Aufgabe, Sprint | oma-pm |
| Automatisch, Parallel, Orchestrieren | oma-orchestrator |

Bei komplexen Anfragen, die mehrere Domänen umfassen, folgt das Routing etablierten Ausführungsreihenfolgen. Zum Beispiel wird "Erstelle eine Fullstack-App" weitergeleitet an: oma-pm (Plan), dann oma-backend + oma-frontend (parallele Implementierung), dann oma-qa (Review).

---

## Nächste Schritte

- **[Installation](./installation.md)** — Drei Installationsmethoden, Presets, CLI-Einrichtung und Verifikation
- **[Agenten](/docs/core-concepts/agents)** — Vertiefung in alle 14 Agenten und Charter Preflight
- **[Skills](/docs/core-concepts/skills)** — Die Zwei-Schichten-Architektur erklärt
- **[Workflows](/docs/core-concepts/workflows)** — Alle 14 Workflows mit Triggern und Phasen
- **[Nutzungsleitfaden](/docs/guide/usage)** — Praxisbeispiele von Einzelaufgaben bis zur vollständigen Orchestrierung
