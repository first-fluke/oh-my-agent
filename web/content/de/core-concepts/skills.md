---
title: Skills
description: Vollständige Anleitung zur Zwei-Schichten-Skill-Architektur von oh-my-agent — SKILL.md-Design, On-Demand-Ressourcenladen, jede geteilte Ressource erklärt, bedingte Protokolle, Ressourcentypen pro Skill, Anbieter-Ausführungsprotokolle, Token-Einsparungsberechnung und Skill-Routing-Mechanik.
---

# Skills

Skills sind strukturierte Wissenspakete, die jedem Agenten seine Domänenexpertise verleihen. Sie sind nicht nur Prompts — sie enthalten Ausführungsprotokolle, Tech-Stack-Referenzen, Code-Vorlagen, Fehler-Playbooks, Qualitätschecklisten und Few-Shot-Beispiele, organisiert in einer Zwei-Schichten-Architektur, die auf Token-Effizienz ausgelegt ist.

---

## Das Zwei-Schichten-Design

### Schicht 1: SKILL.md (~800 Bytes, immer geladen)

Jeder Skill hat eine `SKILL.md`-Datei in seinem Stammverzeichnis. Diese wird immer in das Kontextfenster geladen, wenn der Skill referenziert wird. Sie enthält:

- **YAML-Frontmatter** mit `name` und `description` (verwendet für Routing und Anzeige)
- **Wann verwenden / Wann NICHT verwenden** — explizite Aktivierungsbedingungen
- **Kernregeln** — die 5-15 kritischsten Einschränkungen für die Domäne
- **Architekturübersicht** — wie Code strukturiert sein sollte
- **Bibliotheksliste** — genehmigte Abhängigkeiten und deren Zwecke
- **Referenzen** — Verweise auf Schicht-2-Ressourcen (werden nie automatisch geladen)

Beispiel-Frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Das description-Feld ist entscheidend — es enthält die Routing-Keywords, die das Skill-Routing-System zur Zuordnung von Aufgaben zu Agenten verwendet.

### Schicht 2: resources/ (bedarfsgesteuert geladen)

Das `resources/`-Verzeichnis enthält vertiefte Ausführungskenntnisse. Diese Dateien werden nur geladen, wenn:
1. Der Agent explizit aufgerufen wird (via `/command` oder Agenten-Skills-Feld)
2. Die spezifische Ressource für den aktuellen Aufgabentyp und Schwierigkeitsgrad benötigt wird

Dieses bedarfsgesteuerte Laden wird durch den Context-Loading-Leitfaden (`.agents/skills/_shared/core/context-loading.md`) gesteuert, der Aufgabentypen den erforderlichen Ressourcen pro Agent zuordnet.

---

## Beispiel der Dateistruktur

```
.agents/skills/oma-frontend/
├── SKILL.md                          <- Schicht 1: immer geladen (~800 Bytes)
└── resources/
    ├── execution-protocol.md         <- Schicht 2: Schritt-für-Schritt-Workflow
    ├── tech-stack.md                 <- Schicht 2: detaillierte Technologiespezifikationen
    ├── tailwind-rules.md             <- Schicht 2: Tailwind-spezifische Konventionen
    ├── component-template.tsx        <- Schicht 2: React-Komponentenvorlage
    ├── snippets.md                   <- Schicht 2: kopierbereite Code-Muster
    ├── error-playbook.md             <- Schicht 2: Fehlerbehandlungsverfahren
    ├── checklist.md                  <- Schicht 2: Qualitätsverifikationscheckliste
    └── examples/                     <- Schicht 2: Few-Shot-Ein-/Ausgabebeispiele
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              <- Domänenspezifisch (ORM-Abfragen, N+1, Transaktionen)
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             <- Generiert durch /stack-set (sprachspezifisch)
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
├── reference/                         <- Vertieftes Referenzmaterial
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## Ressourcentypen pro Skill

| Ressourcentyp | Dateinamenmuster | Zweck | Wann geladen |
|--------------|-----------------|---------|-------------|
| **Ausführungsprotokoll** | `execution-protocol.md` | Schritt-für-Schritt-Workflow: Analysieren -> Planen -> Implementieren -> Verifizieren | Immer (mit SKILL.md) |
| **Tech-Stack** | `tech-stack.md` | Detaillierte Technologiespezifikationen, Versionen, Konfiguration | Komplexe Aufgaben |
| **Fehler-Playbook** | `error-playbook.md` | Wiederherstellungsverfahren mit "3-Strikes"-Eskalation | Nur bei Fehlern |
| **Checkliste** | `checklist.md` | Domänenspezifische Qualitätsverifikation | Beim Verifikationsschritt |
| **Snippets** | `snippets.md` | Kopierbereite Code-Muster | Mittlere/komplexe Aufgaben |
| **Beispiele** | `examples.md` oder `examples/` | Few-Shot-Ein-/Ausgabebeispiele für das LLM | Mittlere/komplexe Aufgaben |
| **Varianten** | `stack/`-Verzeichnis | Sprach-/Framework-spezifische Referenzen (generiert durch `/stack-set`) | Wenn Stack vorhanden |
| **Vorlagen** | `component-template.tsx`, `screen-template.dart` | Boilerplate-Dateivorlagen | Bei Komponentenerstellung |
| **Domänenreferenz** | `orm-reference.md`, `anti-patterns.md` usw. | Vertiefte Domänenkenntnisse für spezifische Teilaufgaben | Aufgabentypspezifisch |

---

## Gemeinsame Ressourcen (_shared/)

Alle Agenten teilen gemeinsame Grundlagen aus `.agents/skills/_shared/`. Diese sind in drei Kategorien organisiert:

### Kernressourcen (`.agents/skills/_shared/core/`)

| Ressource | Zweck | Wann geladen |
|----------|---------|-------------|
| **`skill-routing.md`** | Ordnet Aufgaben-Keywords dem richtigen Agenten zu. Enthält die Skill-Agent-Zuordnungstabelle, Routing-Muster für komplexe Anfragen, Inter-Agent-Abhängigkeitsregeln, Eskalationsregeln und Zug-Limit-Leitfaden. | Referenziert von Orchestrator- und Koordinations-Skills |
| **`context-loading.md`** | Definiert, welche Ressourcen für welchen Aufgabentyp und Schwierigkeitsgrad geladen werden. Enthält pro-Agent-Aufgabentyp-zu-Ressource-Zuordnungstabellen und bedingte Protokoll-Ladetrigger. | Beim Workflow-Start (Schritt 0 / Phase 0) |
| **`prompt-structure.md`** | Definiert die vier Elemente, die jeder Aufgaben-Prompt enthalten muss: Ziel, Kontext, Einschränkungen, Fertig-wenn. Enthält Vorlagen für PM-, Implementierungs- und QA-Agenten. Listet Anti-Patterns auf (Beginn mit nur einem Ziel). | Referenziert von PM-Agent und allen Workflows |
| **`clarification-protocol.md`** | Definiert Unsicherheitsebenen (LOW/MEDIUM/HIGH) mit Aktionen für jede Ebene. Enthält Unsicherheitsauslöser, Eskalationsvorlagen, erforderliche Verifikationselemente pro Agententyp und Subagenten-Modus-Verhalten. | Bei mehrdeutigen Anforderungen |
| **`context-budget.md`** | Token-Budget-Verwaltung. Definiert Strategie zum Dateilesen (verwende `find_symbol`, nicht `read_file`), Ressourcenladebudgets pro Modellebene (Flash: ~3.100 Tokens / Pro: ~5.000 Tokens), Behandlung großer Dateien und Symptome bei Kontextüberlauf. | Beim Workflow-Start |
| **`difficulty-guide.md`** | Kriterien zur Klassifizierung von Aufgaben als Einfach/Mittel/Komplex. Definiert erwartete Zugzahlen, Protokollverzweigung (Schnellweg / Standard / Erweitert) und Fehleinschätzungskorrektur. | Beim Aufgabenstart (Schritt 0) |
| **`reasoning-templates.md`** | Strukturierte Reasoning-Ausfüllvorlagen für häufige Entscheidungsmuster (z. B. Explorations-Entscheidungsvorlage #6, verwendet von der Explorationsschleife). | Bei komplexen Entscheidungen |
| **`quality-principles.md`** | 4 universelle Qualitätsprinzipien, die über alle Agenten hinweg angewendet werden. | Beim Workflow-Start für qualitätsfokussierte Workflows (ultrawork) |
| **`vendor-detection.md`** | Protokoll zur Erkennung der aktuellen Laufzeitumgebung (Claude Code, Codex CLI, Gemini CLI, Antigravity, CLI-Fallback). Verwendet Markerprüfungen: Agent-Tool = Claude Code, apply_patch = Codex, @-Syntax = Gemini. | Beim Workflow-Start |
| **`session-metrics.md`** | Clarification-Debt-Bewertung (CD) und Sitzungsmetrik-Verfolgung. Definiert Ereignistypen (clarify +10, correct +25, redo +40), Schwellenwerte (CD >= 50 = RCA, CD >= 80 = Pause) und Integrationspunkte. | Während Orchestrierungssitzungen |
| **`common-checklist.md`** | Universelle Qualitätscheckliste, die bei der abschließenden Verifikation komplexer Aufgaben angewendet wird (zusätzlich zu agentenspezifischen Checklisten). | Verifikationsschritt komplexer Aufgaben |
| **`lessons-learned.md`** | Sammlung vergangener Sitzungserkenntnisse, automatisch generiert aus Clarification-Debt-Überschreitungen und verworfenen Experimenten. Nach Domänenabschnitten organisiert. | Referenziert nach Fehlern und am Sitzungsende |
| **`api-contracts/`** | Verzeichnis mit API-Vertragsvorlage und generierten Verträgen. `template.md` definiert das Pro-Endpunkt-Format (Methode, Pfad, Anfrage-/Antwort-Schemata, Auth, Fehler). | Bei geplanter domänenübergreifender Arbeit |

### Laufzeit-Ressourcen (`.agents/skills/_shared/runtime/`)

| Ressource | Zweck |
|----------|---------|
| **`memory-protocol.md`** | Memory-Dateiformat und -Operationen für CLI-Subagenten. Definiert On-Start-, During-Execution- und On-Completion-Protokolle mit konfigurierbaren Memory-Tools (read/write/edit). Enthält Experimentverfolgungserweiterung. |
| **`execution-protocols/claude.md`** | Claude-Code-spezifische Ausführungsmuster. Wird von `oma agent:spawn` injiziert, wenn der Vendor claude ist. |
| **`execution-protocols/gemini.md`** | Gemini-CLI-spezifische Ausführungsmuster. |
| **`execution-protocols/codex.md`** | Codex-CLI-spezifische Ausführungsmuster. |
| **`execution-protocols/qwen.md`** | Qwen-CLI-spezifische Ausführungsmuster. |

Vendor-spezifische Ausführungsprotokolle werden automatisch von `oma agent:spawn` injiziert — Agenten müssen sie nicht manuell laden.

### Bedingte Ressourcen (`.agents/skills/_shared/conditional/`)

Diese werden nur geladen, wenn bestimmte Bedingungen während der Ausführung erfüllt sind:

| Ressource | Auslösebedingung | Geladen von | Ungefähre Tokens |
|----------|-------------------|-----------|----------------|
| **`quality-score.md`** | VERIFY- oder SHIP-Phase beginnt in einem Workflow, der Qualitätsmessung unterstützt | Orchestrator (wird an QA-Agent-Prompt übergeben) | ~250 |
| **`experiment-ledger.md`** | Erstes Experiment wird aufgezeichnet, nachdem eine IMPL-Baseline etabliert wurde | Orchestrator (inline, nach Baseline-Messung) | ~250 |
| **`exploration-loop.md`** | Dasselbe Gate scheitert zweimal beim selben Problem | Orchestrator (inline, vor dem Starten von Hypothesen-Agenten) | ~250 |

Budgetauswirkung: ungefähr 750 Tokens insgesamt, wenn alle 3 geladen werden. Da das Laden bedingt ist, laden typische Sitzungen 1-2 davon. Das Flash-Tier-Budget bleibt innerhalb der ungefähr 3.100 Token-Zuweisung.

---

## Wie Skills über skill-routing.md geroutet werden

Die Skill-Routing-Karte definiert, wie Aufgaben Agenten zugeordnet werden:

### Einfaches Routing (einzelne Domäne)

Ein Prompt mit "Build a login form with Tailwind CSS" stimmt mit den Keywords `UI`, `component`, `form`, `Tailwind` überein und wird an **oma-frontend** weitergeleitet.

### Routing komplexer Anfragen

Multi-Domänen-Anfragen folgen etablierten Ausführungsreihenfolgen:

| Anfragemuster | Ausführungsreihenfolge |
|----------------|----------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) parallel -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) parallel -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> relevante Agenten -> oma-qa |
| "Do everything automatically" | oma-orchestrator (intern: oma-pm -> Agenten -> oma-qa) |

### Inter-Agent-Abhängigkeitsregeln

**Können parallel laufen (keine Abhängigkeiten):**
- oma-backend + oma-frontend (wenn API-Vertrag vorab definiert ist)
- oma-backend + oma-mobile (wenn API-Vertrag vorab definiert ist)
- oma-frontend + oma-mobile (unabhängig voneinander)

**Müssen sequenziell laufen:**
- oma-brainstorm -> oma-pm (Design kommt vor Planung)
- oma-pm -> alle anderen Agenten (Planung kommt zuerst)
- Implementierungsagent -> oma-qa (Review nach Implementierung)
- oma-backend -> oma-frontend/oma-mobile (wenn kein vorab definierter API-Vertrag)

**QA ist immer zuletzt**, außer wenn der Benutzer nur ein Review bestimmter Dateien anfordert.

---

## Token-Einsparungsberechnung

Betrachten Sie eine 5-Agenten-Orchestrierungssitzung (pm, backend, frontend, mobile, qa):

**Ohne progressive Offenlegung:**
- Jeder Agent lädt alle Ressourcen: ~4.000 Tokens pro Agent
- Gesamt: 5 x 4.000 = 20.000 Tokens verbraucht, bevor Arbeit beginnt

**Mit progressiver Offenlegung:**
- Nur Schicht 1 für alle Agenten: 5 x 800 = 4.000 Tokens
- Schicht 2 nur für aktive Agenten geladen (typischerweise 1-2 gleichzeitig): +1.500 Tokens
- Gesamt: ~5.500 Tokens

**Einsparung: ungefähr 72-75 %**

Bei Flash-Tier-Modellen (128K Kontext) ist dies der Unterschied zwischen 108K verfügbaren Tokens für Arbeit und 125K Tokens — eine erhebliche Marge für komplexe Aufgaben.

---

## Ressourcenladen nach Aufgabenschwierigkeit

Der Schwierigkeitsleitfaden klassifiziert Aufgaben in drei Stufen, die bestimmen, wie viel von Schicht 2 geladen wird:

### Einfach (3-5 erwartete Züge)

Einzelne Dateiänderung, klare Anforderungen, Wiederholung vorhandener Muster.

Lädt: nur `execution-protocol.md`. Analyse überspringen, direkt zur Implementierung mit minimaler Checkliste.

### Mittel (8-15 erwartete Züge)

2-3 Dateiänderungen, einige Designentscheidungen nötig, Anwendung von Mustern auf neue Domänen.

Lädt: `execution-protocol.md` + `examples.md`. Standardprotokoll mit kurzer Analyse und vollständiger Verifikation.

### Komplex (15-25 erwartete Züge)

4+ Dateiänderungen, Architekturentscheidungen erforderlich, Einführung neuer Muster, Abhängigkeiten von anderen Agenten.

Lädt: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Erweitertes Protokoll mit Checkpoints, Fortschrittsaufzeichnung während der Ausführung und vollständiger Verifikation einschließlich `common-checklist.md`.

---

## Context-Loading-Aufgabenzuordnungen (pro Agent)

Der Context-Loading-Leitfaden bietet detaillierte Aufgabentyp-zu-Ressource-Zuordnungen. Hier sind die wichtigsten Zuordnungen:

### Backend-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| CRUD-API-Erstellung | stack/snippets.md (Route, Schema, Modell, Test) |
| Authentifizierung | stack/snippets.md (JWT, Passwort) + stack/tech-stack.md |
| DB-Migration | stack/snippets.md (Migration) |
| Performance-Optimierung | examples.md (N+1-Beispiel) |
| Vorhandenen Code modifizieren | examples.md + Serena MCP |

### Frontend-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| Komponentenerstellung | snippets.md + component-template.tsx |
| Formularimplementierung | snippets.md (Formular + Zod) |
| API-Integration | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Seitenlayout | snippets.md (Grid) + examples.md |

### Design-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| Design-System-Erstellung | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Landingpage-Design | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| Design-Audit | checklist.md + anti-patterns.md |
| Design-Token-Export | design-tokens.md |
| 3D- / Shader-Effekte | reference/shader-and-3d.md + reference/motion-design.md |
| Barrierefreiheits-Review | reference/accessibility.md + checklist.md |

### QA-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| Sicherheits-Review | checklist.md (Sicherheitsabschnitt) |
| Performance-Review | checklist.md (Performance-Abschnitt) |
| Barrierefreiheits-Review | checklist.md (Barrierefreiheitsabschnitt) |
| Vollständiges Audit | checklist.md (komplett) + self-check.md |
| Qualitätsbewertung | quality-score.md (bedingt) |

---

## Orchestrator-Prompt-Zusammenstellung

Wenn der Orchestrator Prompts für Subagenten zusammenstellt, enthält er nur aufgabenrelevante Ressourcen:

1. Kernregeln-Abschnitt der SKILL.md des Agenten
2. `execution-protocol.md`
3. Ressourcen, die dem spezifischen Aufgabentyp entsprechen (aus den obigen Zuordnungen)
4. `error-playbook.md` (immer enthalten — Fehlerbehandlung ist essenziell)
5. Serena Memory Protocol (CLI-Modus)

Diese zielgerichtete Zusammenstellung vermeidet das Laden unnötiger Ressourcen und maximiert den verfügbaren Kontext des Subagenten für die eigentliche Arbeit.
