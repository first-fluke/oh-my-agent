---
title: Projektstruktur
description: Erschöpfender Verzeichnisbaum einer oh-my-agent-Installation mit jeder Datei und jedem Verzeichnis erklärt — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, skills-Symlinks, agents), .serena/memories/ und die Struktur des oh-my-agent-Quell-Repositorys.
---

# Projektstruktur

Nach der Installation von oh-my-agent erhält Ihr Projekt drei Verzeichnisbäume: `.agents/` (die einzige Wahrheitsquelle), `.claude/` (IDE-Integrationsschicht) und `.serena/` (Laufzeitzustand). Diese Seite dokumentiert jede Datei und ihren Zweck.

---

## Vollständiger Verzeichnisbaum

```
your-project/
├── .agents/                          <- Einzige Wahrheitsquelle (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    <- Sprache, Zeitzone, CLI-Zuordnung
│   │
│   ├── skills/
│   │   ├── _shared/                  <- Ressourcen für ALLE Agenten
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 <- Generiert durch /stack-set
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   └── ...                        <- Weitere Skill-Verzeichnisse
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             <- Persistent: automatisierte parallele Ausführung
│   │   ├── work.md             <- Persistent: schrittweise Koordination
│   │   ├── ultrawork.md              <- Persistent: 5-Phasen-Qualitätsworkflow
│   │   ├── plan.md                   <- PM-Aufgabenzerlegung
│   │   ├── exec-plan.md              <- Ausführungsplanverwaltung
│   │   ├── brainstorm.md             <- Design-first-Ideenfindung
│   │   ├── deepinit.md               <- Projektinitialisierung
│   │   ├── review.md                 <- QA-Review-Pipeline
│   │   ├── debug.md                  <- Strukturiertes Debugging
│   │   ├── design.md                 <- 7-Phasen-Design-Workflow
│   │   ├── scm.md                 <- Conventional Commits
│   │   ├── tools.md                  <- MCP-Tool-Verwaltung
│   │   └── stack-set.md              <- Tech-Stack-Konfiguration
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        <- Subagenten-Def.: Backend
│   │   ├── frontend-engineer.md       <- Subagenten-Def.: Frontend
│   │   ├── mobile-engineer.md         <- Subagenten-Def.: Mobile
│   │   ├── db-engineer.md             <- Subagenten-Def.: Datenbank
│   │   ├── qa-reviewer.md             <- Subagenten-Def.: QA
│   │   ├── debug-investigator.md      <- Subagenten-Def.: Debug
│   │   └── pm-planner.md             <- Subagenten-Def.: PM
│   │
│   ├── results/plan-{sessionId}.json                      <- Generierter Plan-Output (befüllt durch /plan)
│   ├── state/                         <- Aktive Workflow-Zustandsdateien
│   ├── results/                       <- Agenten-Ergebnisdateien
│   └── mcp.json                       <- MCP-Server-Konfiguration
│
├── .claude/                           <- IDE-Integrationsschicht
│   ├── settings.json                  <- Hook-Registrierung und Berechtigungen
│   ├── hooks/
│   │   ├── triggers.json              <- Keyword-zu-Workflow-Zuordnung (11 Sprachen)
│   │   ├── keyword-detector.ts        <- Auto-Erkennungslogik
│   │   ├── persistent-mode.ts         <- Persistenter-Workflow-Durchsetzung
│   │   └── hud.ts                     <- [OMA]-Statuszeilen-Indikator
│   ├── skills/                        <- Symlinks -> .agents/skills/
│   └── agents/                        <- Subagenten-Definitionen für Claude Code
│
└── .serena/                           <- Laufzeitzustand (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    <- Sitzungs-ID, Status, Phasenverfolgung
        ├── task-board.md              <- Aufgabenzuweisungen und Status
        ├── progress-{agent}.md        <- Pro-Agent-Fortschrittsupdates
        ├── result-{agent}.md          <- Pro-Agent-Endergebnisse
        ├── session-metrics.md         <- Clarification-Debt und Qualitätsbewertungsverfolgung
        ├── experiment-ledger.md       <- Experimentverfolgung (bedingt)
        └── archive/
            └── metrics-{date}.md      <- Archivierte Sitzungsmetriken
```

---

## .agents/ — Die Wahrheitsquelle

Dies ist das Kernverzeichnis. Alles, was Agenten benötigen, lebt hier. Es ist das einzige Verzeichnis, das für das Agentenverhalten relevant ist — alle anderen Verzeichnisse werden davon abgeleitet.

### config/

**`oma-config.yaml`** — Zentrale Konfigurationsdatei mit:
- `language`: Antwortsprachcode (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Zeitstempelformat (Standard: `YYYY-MM-DD`)
- `timezone`: Zeitzonen-Bezeichner (Standard: `UTC`)
- `default_cli`: Fallback-CLI-Vendor (antigravity, claude, codex, qwen)
- `model_preset (per-agent overrides via `agents:`)`: Pro-Agent-CLI-Routing-Überschreibungen

### skills/

Hier lebt die Agentenexpertise. 22 Verzeichnisse insgesamt: 21 Agenten-Skills + 1 gemeinsames Ressourcenverzeichnis.

**`_shared/`** — Ressourcen, die von allen Agenten verwendet werden:
- `core/` — Routing, Context-Loading, Prompt-Struktur, Klärungsprotokoll, Kontextbudget, Schwierigkeitsbewertung, Reasoning-Vorlagen, Qualitätsprinzipien, Vendor-Erkennung, Sitzungsmetriken, gemeinsame Checkliste, gewonnene Erkenntnisse, API-Vertragsvorlagen
- `runtime/` — Memory-Protokoll für CLI-Subagenten, vendor-spezifische Ausführungsprotokolle (claude, codex, qwen)
- `conditional/` — Qualitätsbewertungsmessung, Experimentprotokoll-Verfolgung, Explorationsschleifen-Protokoll (wird nur bei Auslösung geladen)

**`oma-{agent}/`** — Pro-Agent-Skill-Verzeichnisse. Jedes enthält:
- `SKILL.md` (~800 Bytes) — Schicht 1: immer geladen. Identität, Routing, Kernregeln.
- `resources/` — Schicht 2: bedarfsgesteuert. Ausführungsprotokolle, Beispiele, Checklisten, Fehler-Playbooks, Tech-Stacks, Snippets, Vorlagen.
- Manche Agenten haben zusätzliche Unterverzeichnisse: `stack/` (oma-backend, generiert durch /stack-set), `reference/` (oma-design), `examples/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm).

### workflows/

16 Markdown-Dateien, die das Verhalten von Slash-Befehlen definieren. Jede Datei enthält:
- YAML-Frontmatter mit `description`
- Pflichtregeln-Abschnitt (Antwortsprache, Schrittreihenfolge, MCP-Tool-Anforderungen)
- Vendor-Erkennungsanweisungen
- Schritt-für-Schritt-Ausführungsprotokoll
- Gate-Definitionen (für persistente Workflows)

Persistente Workflows: `orchestrate.md`, `work.md`, `ultrawork.md`.
Nicht-persistente: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

7 Subagenten-Definitionsdateien, die beim Starten von Agenten über das Task-Tool (Claude Code) oder die CLI verwendet werden. Jede Datei definiert:
- Frontmatter: `name`, `description`, `skills` (welcher Skill geladen wird)
- Verweis auf das Ausführungsprotokoll
- Charter Preflight (CHARTER_CHECK)-Vorlage
- Architekturzusammenfassung
- Domänenspezifische Regeln (10 Regeln)
- Anweisung: "Niemals `.agents/`-Dateien modifizieren"

### plan-\{sessionId\}.json

Generiert durch den `/plan`-Workflow. Enthält die strukturierte Aufgabenzerlegung mit Agentenzuweisungen, Prioritäten, Abhängigkeiten und Akzeptanzkriterien. Wird von `/orchestrate`, `/work` und `/exec-plan` konsumiert.

### state/

Aktive Workflow-Zustandsdateien für persistente Workflows. Diese JSON-Dateien existieren nur, während ein persistenter Workflow läuft. Ihr Löschen (oder "workflow done" sagen) deaktiviert den Workflow.

### results/

Agenten-Ergebnisdateien. Von abgeschlossenen Agenten erstellt mit Status (abgeschlossen/fehlgeschlagen), Zusammenfassung, geänderten Dateien und Akzeptanzkriterien-Checkliste. Vom Orchestrator beim Sammeln und von Dashboards zur Überwachung gelesen.

### mcp.json

MCP-Server-Konfiguration einschließlich:
- Server-Definitionen (Serena usw.)
- Memory-Konfiguration: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (read/write/edit Tool-Namen)
- Toolgruppen-Definitionen für `/tools`-Verwaltung

---

## .claude/ — IDE-Integration

Dieses Verzeichnis verbindet oh-my-agent mit Claude Code und anderen IDEs.

### settings.json

Registriert Hooks und Berechtigungen für Claude Code. Enthält Verweise auf die Hook-Skripte und deren Auslösebedingungen (z. B. `UserPromptSubmit`).

### hooks/

**`triggers.json`** — Die Keyword-zu-Workflow-Zuordnung. Definiert:
- `workflows`: Zuordnung von Workflow-Name zu `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`. `keywords` sind wörtliche Phrasen; `patterns` sind rohe Regex-Strings (kompiliert mit den Flags `iu`).
- `informationalPatterns`: Phrasen, die auf Fragen hindeuten (aus der Auto-Erkennung gefiltert)
- `excludedWorkflows`: Workflows, die explizite `/command`-Aufrufung erfordern
- `cjkScripts`: Sprachcodes mit CJK-Schriften (ko, ja, zh)

Sprachabschnitte in `keywords`, `patterns` und `informationalPatterns` folgen dieser Konvention:
- `*` — Universal/Englisch. Wird unabhängig von der Einstellung `language` in `.agents/oma-config.yaml` immer geladen.
- `en` — Wird aus Gründen der Abwärtskompatibilität geladen. Funktional gleichwertig mit `*`. Neue englische Inhalte gehören in `*`.
- `ko`/`ja`/`zh`/usw. — Sprachspezifisch. Wird nur geladen, wenn `language: <code>` in `.agents/oma-config.yaml` gesetzt ist.

**`keyword-detector.ts`** — TypeScript-Hook, der:
1. Eingabe bereinigt (entfernt Codeblöcke, zitierte Strings, eingefügte System-Echo-Blöcke)
2. Bereinigte Eingabe gegen Trigger-`keywords` (wörtlich) und `patterns` (Regex) scannt
3. In einem 60-Zeichen-Fenster um jeden Treffer auf informationelle Muster prüft
4. Verstärkungsschutz anwendet (unterdrückt, wenn derselbe Workflow innerhalb von 60s mehr als zweimal ausgelöst wurde)
5. `[OMA WORKFLOW: ...]` oder `[OMA PERSISTENT MODE: ...]` in den Kontext injiziert

**`persistent-mode.ts`** — Prüft auf aktive Zustandsdateien in `.agents/state/` und verstärkt die Ausführung persistenter Workflows.

**`hud.ts`** — Rendert den `[OMA]`-Indikator in der Statusleiste mit: Modellname, Kontextverbrauch (farbcodiert: grün/gelb/rot) und aktivem Workflow-Zustand.

### skills/

Symlinks, die auf `.agents/skills/` verweisen. Dies macht Skills für IDEs sichtbar, die aus `.claude/skills/` lesen, während `.agents/` die einzige Wahrheitsquelle bleibt.

### agents/

Subagenten-Definitionen im Format für das Agent-Tool von Claude Code. Diese referenzieren die Skill-Dateien und enthalten die CHARTER_CHECK-Vorlage.

---

## .serena/memories/ — Laufzeitzustand

Hier schreiben Agenten ihren Fortschritt während Orchestrierungssitzungen. Dieses Verzeichnis wird von Dashboards für Echtzeit-Updates überwacht.

| Datei | Eigentümer | Zweck |
|------|-------|---------|
| `orchestrator-session.md` | Orchestrator | Sitzungsmetadaten: ID, Status, Startzeit, aktuelle Phase |
| `task-board.md` | Orchestrator | Aufgabenzuweisungen: Agent, Aufgabe, Priorität, Status, Abhängigkeiten |
| `progress-{agent}.md` | Jeweiliger Agent | Zugweise Updates: durchgeführte Aktionen, gelesene/modifizierte Dateien, aktueller Status |
| `result-{agent}.md` | Jeweiliger Agent | Endergebnis: Abschlussstatus, Zusammenfassung, geänderte Dateien, Akzeptanzkriterien |
| `session-metrics.md` | Orchestrator | Clarification-Debt-Ereignisse, Qualitätsbewertungsentwicklung |
| `experiment-ledger.md` | Orchestrator/QA | Experimentzeilen bei aktiver Qualitätsbewertung |
| `session-work.md` | Work-Workflow | Work-spezifischer Sitzungszustand |
| `session-ultrawork.md` | Ultrawork-Workflow | Ultrawork-spezifische Phasenverfolgung |
| `tool-overrides.md` | /tools-Workflow | Temporäre Tool-Einschränkungen (sitzungsbezogen) |
| `archive/metrics-{date}.md` | System | Archivierte Sitzungsmetriken (30-Tage-Aufbewahrung) |

Memory-Dateipfade und Tool-Namen sind in `.agents/mcp.json` über `memoryConfig` konfigurierbar.

---

## oh-my-agent Quell-Repository-Struktur

Falls Sie an oh-my-agent selbst arbeiten (nicht nur nutzen), ist das Repository ein Monorepo:

```
oh-my-agent/
├── cli/                  <- CLI-Tool-Quellcode (TypeScript, gebaut mit bun)
│   ├── src/              <- Quellcode
│   ├── package.json
│   └── install.sh        <- Bootstrap-Installer
├── web/                  <- Dokumentationsseite (Next.js)
│   └── content/
│       └── en/           <- Englische Dokumentationsseiten
├── action/               <- GitHub Action für automatisierte Skill-Updates
├── docs/                 <- Übersetzte READMEs und Spezifikationen
├── .agents/              <- BEARBEITBAR im Quell-Repo (dies IST die Quelle)
├── .claude/              <- IDE-Integration
├── .serena/              <- Entwicklungs-Laufzeitzustand
├── CLAUDE.md             <- Projektanweisungen für Claude Code
└── package.json          <- Root-Workspace-Konfiguration
```

Im Quell-Repo sind `.agents/`-Modifikationen erlaubt (dies ist die SSOT-Ausnahme für das Quell-Repo selbst). Die `.agents/`-Regeln über das Nicht-Modifizieren dieses Verzeichnisses gelten für Consumer-Projekte, nicht für das oh-my-agent-Repository.

Entwicklungsbefehle:
- `bun run test` — CLI-Tests (vitest)
- `bun run lint` — Lint
- `bun run build` — CLI-Build
- Commits müssen dem konventionellen Commit-Format folgen (commitlint-erzwungen)
