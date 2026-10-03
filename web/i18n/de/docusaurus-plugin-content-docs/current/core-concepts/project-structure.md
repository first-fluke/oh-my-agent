---
title: Projektstruktur
description: Leserorientierte Übersicht einer oh-my-agent-Installation mit der SSOT unter .agents/, repräsentativen Skill-Ressourcen, Workflows, versionierten Agentendefinitionen, Laufzeitstatus, Anbieterintegrationen und dem Layout des Quell-Repositorys.
---

# Projektstruktur

Nach der Installation von oh-my-agent erhält Ihr Projekt zwei zentrale Verzeichnisbäume: `.agents/` (die einzige Wahrheitsquelle einschließlich des Koordinationsspeichers `.agents/state/memories/`) und Laufzeit-Integrationsschichten wie `.claude/`, `.cursor/` und `.codex/`. Wenn Serena als Anbieter für Code-Intelligence ausgewählt ist, kann zusätzlich das optionale Verzeichnis `.serena/` für Serenas Onboarding-Memories vorhanden sein. Diese Seite erklärt die gemeinsamen Dateien sowie die optionalen und generierten Pfade, die bei der Fehlersuche relevant sind.

---

## Repräsentativer Verzeichnisbaum {#representative-directory-tree}

Der folgende Baum zeigt die gemeinsamen Ressourcen und repräsentative Skills für verschiedene Domänen im Detail. Der aktuelle Katalog enthält 33 Skill-Verzeichnisse; ausgelassene Skills folgen demselben Muster aus `SKILL.md` und optionalen `resources/`, `variants/` oder skill-spezifischen Verzeichnissen. Maßgeblich ist immer der aktuelle `.agents/`-Baum, wenn eine generierte oder optionale Datei fehlt.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
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
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```


---

## `.agents/`: die zentrale Wahrheitsquelle {#agents-the-source-of-truth}

Dies ist das Kernverzeichnis. Alles, was Agenten benötigen, liegt hier. Für das Verhalten der Agenten ist nur dieses Verzeichnis maßgeblich; alle anderen Verzeichnisse werden daraus abgeleitet.

### oma-config.cue und oma-config.yaml

**`oma-config.yaml`** ist die zentrale Konfigurationsdatei mit:

- `language`: Sprachcode für Antworten (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Format der Zeitstempel (`ISO`, `US` oder `EU`; Standard `ISO`)
- `timezone`: IANA-Zeitzonenkennung; wenn der Wert fehlt, wird die Systemzeitzone verwendet
- `model_preset`: Aktiver Schlüssel für ein Modell-Preset (standardmäßig `auto` oder ein festes bzw. benutzerdefiniertes Preset)
- `providers`: Anbieter für Docs, Web, Code-Intelligence und semantisches Memory
- `auto_update_cli`: Hintergrundprüfung auf Updates (Standard `true`, mit `false` deaktivierbar)
- `telemetry`: Anbieter-Telemetrie (Standard `false`)
- `mcp.devtools_browsers`: Optionale Browserliste; ohne Wert bleiben vorhandene Einträge erhalten
- `agents`: Optionale Überschreibungen pro Agent (nur `AgentSpec`-Objekte)
- `models`: Optionale, vom Benutzer definierte Modell-Slugs
- `custom_presets`: Optionale, vom Benutzer definierte Presets mit optionalem `extends:`

### skills/

Hier liegt das Fachwissen der Skills. Der aktuelle Katalog enthält 33 Skill-Verzeichnisse zusätzlich zu den gemeinsamen `_shared`-Ressourcen; das Preset `all` wird aus diesem aktuellen Baum abgeleitet.

**`_shared/`** enthält Ressourcen für alle Agenten:

- `core/`: Routing, Kontextladen, Prompt-Struktur, Klärungsprotokoll, Kontextbudget, Schwierigkeitsbewertung, Reasoning-Vorlagen, Qualitätsprinzipien, Anbietererkennung, Sitzungsmetriken, gemeinsame Checkliste, Lessons Learned und Vorlagen für API-Verträge
- `runtime/`: Memory-Protokoll, Event-Spezifikation, Ergebnisvertrag und anbieterspezifische Ausführungsprotokolle
- `conditional/`: Messung des Qualitätsscores, Führung des Experimentprotokolls und Protokoll für Explorationsschleifen (wird nur bei entsprechender Auslösung geladen)

**`oma-{skill}/`** enthält die Verzeichnisse der einzelnen Skills. Jedes enthält:

- `SKILL.md`: Ebene 1, die beim Routing des Skills geladen wird; Identität, Routing und Kernregeln
- `resources/`: Ebene 2, bedarfsgesteuert; Ausführungsprotokolle, Beispiele, Checklisten, Fehler-Playbooks, Tech-Stacks, Snippets und Vorlagen
- Einige Skills haben zusätzliche Unterverzeichnisse: `variants/` (Seeds für Backend und Mobile), generierte `stack/`-Referenzen aus `/stack-set`, `reference/` (bei `oma-design`) sowie skill-spezifische Skripte und Konfigurationen

### workflows/

21 Markdown-Dateien definieren das Verhalten der Slash-Befehle. Jede Datei enthält:

- YAML-Frontmatter mit `description`
- Abschnitt mit Pflichtregeln (Antwortsprache, Reihenfolge der Schritte, Anforderungen an MCP-Tools)
- Anweisungen für die Anbietererkennung
- Schrittweises Ausführungsprotokoll
- Gate-Definitionen für persistente Workflows

Persistente Workflows sind `orchestrate.md`, `work.md`, `ultrawork.md` und `ralph.md`. Zu den nicht persistenten Workflows gehören `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` und `video.md`.

### agents/

12 Definitionsdateien für Subagenten werden verwendet, wenn Agenten über das Task-Tool von Claude Code oder über die CLI gestartet werden. Jede Datei definiert:

- Frontmatter: `name`, `description` und `skills` (der zu ladende Skill)
- Verweis auf das Ausführungsprotokoll
- Vorlage für das Charter-Preflight (`CHARTER_CHECK`)
- Architekturzusammenfassung
- Zehn domänenspezifische Regeln
- Die Anweisung: „`.agents/`-Dateien niemals ändern“

### plan-\{sessionId\}.json

Wird vom Workflow `/plan` erzeugt. Die Datei enthält die strukturierte Aufgabenzerlegung mit Agentenzuweisungen, Prioritäten, Abhängigkeiten und Akzeptanzkriterien. `/orchestrate` und `/work` verwenden sie. Der zugehörige menschenlesbare Tracker liegt unter `docs/plans/work/{NNN}-{name}.md` und wird über das Feld `Status` verwaltet. Dauerhafte Design-Referenzen liegen daneben unter `docs/plans/designs/{NNN}-{name}.md`.

### state/

Hier liegen die aktiven Zustandsdateien persistenter Workflows. Diese JSON-Dateien existieren nur, solange ein persistenter Workflow läuft. Wenn Sie sie löschen oder „Workflow abgeschlossen“ sagen, wird der persistente Modus deaktiviert.

Das Unterverzeichnis `state/memories/` ist der kanonische Koordinationsspeicher: Es enthält den Sitzungszustand des Orchestrators, das Aufgabenboard, Fortschritts- und Ergebnisdateien pro Agent, Sitzungsmetriken und Kostentelemetrie. Die Dashboards überwachen diesen Pfad, und die CLI löst ihn zuerst auf; ältere Projekte verwenden ersatzweise den früheren Pfad `.serena/memories/`. Siehe unten [`.agents/state/memories/`: Laufzeitstatus](#agentsstatememories-runtime-state).

### results/

Ergebnisdateien der Agenten. Abgeschlossene Agenten erstellen sie mit Status (abgeschlossen/fehlgeschlagen), Zusammenfassung, Liste der geänderten Dateien und einer Checkliste der Akzeptanzkriterien. Der Orchestrator liest sie beim Sammeln, und Dashboards verwenden sie zur Überwachung.

### mcp.json

MCP-Server-Konfiguration einschließlich:

- Serverdefinitionen (Serena und weitere)
- Speicherkonfiguration: `memoryConfig.provider`, `memoryConfig.basePath` und `memoryConfig.tools` (Namen der Lese-, Schreib- und Bearbeitungswerkzeuge)
- Definitionen von Toolgruppen für die Verwaltung über `/tools`

---

## `.claude/`: IDE-Integration {#claude-ide-integration}

Dieses Verzeichnis verbindet oh-my-agent mit Claude Code und anderen IDEs.

### settings.json

Registriert Hooks und Berechtigungen für Claude Code. Jeder Event-Hook verwendet jetzt die kanonische ABI `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```


Der Eintrag `statusLine` bleibt ein direkter `bun`-Pfad (Anzeige im Hot Path, nicht über `oma hook run` geroutet).

### hooks/

Das `hooks/`-Verzeichnis eines Anbieters enthält **nur die Dateien, die aus diesem Verzeichnis zur Laufzeit ausgeführt oder gelesen werden**. Die Handlerkette selbst (Schlüsselworterkennung, persistenter Modus, Skill-Injektion usw.) läuft innerhalb des `oma`-Binaries über `oma hook run`; die `.ts`-Handler werden beim Build in die CLI gebündelt und **nicht** in Anbieter-Verzeichnissen materialisiert.

**`oma-hook.sh`** ist ein generiertes Wrapper-Skript, das `oma link`, `oma install` oder `oma update` schreibt. Jedes Anbieter-Hook-Ereignis läuft über diese Datei. Die Auflösungsreihenfolge zur Laufzeit lautet: `$OMA_BIN` (explizite Überschreibung) → `command -v oma` (PATH) → bekannte Installationsverzeichnisse wie `$HOME/.bun/bin` und `$HOME/.local/share/mise/shims` (über die GUI gestartete Agenten erben einen verkürzten PATH) → `exit 0` (fail-open; der Agent wird niemals blockiert). Das Skript enthält nichts Rechnerspezifisches, ist daher für alle Entwickler byte-identisch und kann sicher versioniert werden. Es reicht `"$@"` unverändert weiter, damit `--vendor`, `--event` und `--matcher` unverändert bei `oma hook run` ankommen. Die Präambel zur Selbstentdoppelung unterdrückt doppelte Auslösungen, wenn sowohl eine Projekt- als auch eine globale Installation dasselbe Ereignis registriert.

**`hud.ts`** rendert den `[OMA]`-Indikator in der Statusleiste mit Modellnamen, Kontextverbrauch (farbcodiert: grün/gelb/rot) und dem Status des aktiven Workflows. Er wird direkt unter `statusLine` registriert, nicht über `oma hook run`, damit die Renderlatenz im Hot Path niedrig bleibt. Er wird nur für Anbieter materialisiert, deren Variante ein `statusLine`- oder nur für den HUD bestimmtes Ereignis registriert, etwa Claude, Antigravity und Qwen. Das Skript erkennt das Dialektformat des Anbieters aus seinem eigenen Installationspfad; die Kopie pro Anbieter ist deshalb für die Ausführung erforderlich.

**`filter-test-output.sh`** ist ein Shell-Filter, der störende Ausgaben von Test-Runnern kürzt. Der prozessinterne Testfilter schreibt erkannte Bash-Testbefehle so um, dass sie über `<hookDir>/filter-test-output.sh` geleitet werden. Deshalb wird diese Datei für jeden Anbieter materialisiert, dessen Variante `test-filter.ts` registriert (alle außer Cursor).

#### Wo die Handlerlogik tatsächlich liegt

Die Handlerquellen sind unter `.agents/hooks/core/` die SSOT und laufen prozessintern über `oma hook run`:

**`keyword-detector.ts`** ist ein reiner Handler (`run(input, ctx): HandlerResult | null`) für die Schlüsselworterkennung. Die Logik:

1. Bereinigt die Eingabe (entfernt Codeblöcke, zitierte Zeichenketten und eingefügte System-Echo-Blöcke)
2. Durchsucht die bereinigte Eingabe nach Trigger-`keywords` (wörtlich) und `patterns` (reguläre Ausdrücke)
3. Prüft in einem Fenster von 60 Zeichen um jeden Treffer auf Informationsmuster
4. Wendet eine Verstärkungssperre an (unterdrückt die Auslösung, wenn derselbe Workflow innerhalb von 60 Sekunden mindestens zweimal ausgelöst wurde)
5. Gibt ein `context`-Ergebnis zurück, das `[OMA WORKFLOW: ...]` oder `[OMA PERSISTENT MODE: ...]` injiziert

**`persistent-mode.ts`** ist ein reiner Handler (`run()`), der aktive Zustandsdateien unter `.agents/state/` prüft und die Ausführung persistenter Workflows verstärkt. Er wird bei `Stop`-Ereignissen prozessintern über `oma hook run` aufgerufen.

**`scm-guard.ts`** ist ein reiner Handler (`run()`) für `PreToolUse` (Bash-/Shell-Tools), der `git add` für Dateien blockiert, die wahrscheinlich Geheimnisse enthalten. Er erzwingt `forbidden_patterns` abzüglich `allowed_exceptions` aus `.agents/skills/oma-scm/config/commit-config.yaml` und verwendet eingebettete Standardwerte, wenn die Konfiguration fehlt. In der Kette für Claude, Codex, Cursor, Grok, Kimi, Kiro und Qwen läuft er vor `test-filter`; ebenso in der OpenCode-Bridge (`tool.execute.before` wirft zum Blockieren) und der Pi-Bridge (`tool_call` liefert `{ block: true, reason }`). Ein Befehl mit dem Präfix `OMA_SCM_ALLOW_SECRETS=1` umgeht den Guard nach ausdrücklicher Benutzerfreigabe. Breites Staging (`git add -A` / `git add .`) wird absichtlich nicht blockiert, weil diese Regel von der Zustimmung des Benutzers abhängt, die der Hook nicht erkennen kann.

**`code-intelligence-guard.ts`** ist ein reiner Handler (`run()`) für `PreToolUse`, der die Regel „Code Search“ mechanisch durchsetzt. Solange `providers.code_intelligence` zu `serena` (oder `gortex`) aufgelöst wird und `providers.code_intelligence_guard` nicht `off` ist, blockiert er die nativen Suchwerkzeuge (`Grep`, `Glob` in Claude Code) sowie Shell-Befehle, deren führendes Binary eine rekursive Codesuche ist (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`); der Blockierungsgrund nennt das stattdessen zu verwendende Provider-Tool (`search_for_pattern`, `find_file`, `find_symbol`). Nicht rekursives `grep` (Pipe-Filter, einzelne Dateien), `find` ohne Namensprädikat und Lesezugriffe bleiben immer unberührt. Er wird für Claude, Codex, Cursor, Grok, Kimi, Kiro und Qwen unmittelbar nach `scm-guard` registriert; der Installer bildet die Vereinigung der Matcher der Kette, sodass der `PreToolUse`-Eintrag von Claude zu `Bash|Grep|Glob` wird. Ein Shell-Befehl, der `OMA_CI_ALLOW_NATIVE=1` enthält, umgeht den Guard weiterhin, aber nur als Operator-Notausgang für Suchen in Ressourcen außerhalb des Projekts oder in ignorierten Pfaden, die der Guard nicht erkannt hat. Der Blockierungsgrund nennt dieses Präfix nicht, und es ist kein Ausweichweg für Projektquellcode.

**`triggers.json`** ist die Zuordnung von Schlüsselwörtern zu Workflows. Sie wird beim Build statisch in das `oma`-Binary eingebettet (Quelle: `.agents/hooks/core/triggers.json`). Sie definiert:

- `workflows`: Map von Workflownamen auf `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` sind wörtliche Phrasen; `patterns` sind rohe Regex-Zeichenketten (mit den Flags `iu` kompiliert). `explicit` (nur persistente Workflows) listet die Schlüsselwörter auf, die als expliziter Aufruf gelten — nur diese aktivieren den persistenten Modus; jeder andere Treffer wird als Vorschlag eingefügt
- `informationalPatterns`: Phrasen, die Fragen kennzeichnen und aus der automatischen Erkennung herausgefiltert werden
- `excludedWorkflows`: Workflows, die einen expliziten Aufruf über `/command` verlangen

Für die Sprachabschnitte in `keywords`, `patterns` und `informationalPatterns` gilt:

- `*`: Universal/Englisch
- `en`: funktional gleichwertig mit `*`
- `ko`/`ja`/`zh`/usw.: sprachspezifische Formulierungen

Jeder Abschnitt wird immer geladen; die Einstellung `language` in `.agents/oma-config.yaml` steuert nur die Antwortsprache. Wortgrenzen hängen vom Schlüsselwort selbst ab: ASCII-Schlüsselwörter passen nur auf ganze Wörter, Schlüsselwörter mit Nicht-ASCII-Text passen als Teilzeichenketten.

#### Materialisierung pro Anbieter: vorher → nachher

Ältere Installationen kopierten den **gesamten** Satz unter `.agents/hooks/core/` (etwa 20 Dateien) in jedes Anbieter-Hook-Verzeichnis, obwohl die prozessinterne Weiterleitung die meisten davon zu ungenutzten Dateien machte:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```


Der Installer leitet jetzt aus der Varianten-JSON eines Anbieters (`requiredVariantScripts` in `cli/platform/hooks-composer.ts`) eine Whitelist ab und materialisiert nur, was dieser Anbieter ausführt oder liest:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```


| Anbieter | Materialisierte Dateien | Grund |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, kein statusLine |
| cursor | `oma-hook.sh` | kein statusLine, kein test-filter |
| commandcode | `oma-hook.sh` | nur Stop — Command Code hat kein Prompt-Ereignis, und PreToolUse kann die Eingabe nicht umschreiben ([Hooks-Referenz](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | keine im Projekt — `hud.ts` und die Core-Hooks werden nach `~/.gemini/antigravity-cli/hooks/` kopiert | agy liest Einstellungen nur aus HOME; Workspace-Hooks aus `.agents/hooks.json` führen die Handler direkt aus `.agents/hooks/core/` aus. Ein Projektpfad `.gemini/antigravity-cli/` wird nie geladen (`homeOnly`-Variantenflag) |
| pi | vollständiger Satz unter `.pi/extensions/oma/` | Die Pi-Bridge startet Handler als Subprozesse statt über Settings-Hooks |

Das Zielverzeichnis wird vor dem Kopieren geleert. Wenn Sie `oma install`, `oma update` oder `oma link` auf einer älteren Installation erneut ausführen, werden dadurch automatisch die alten Dateien aus der vollständigen Kopie entfernt.

#### Eine Handlerkette isoliert debuggen

Sie können jede Handlerkette mit einer echten Nutzlast ausführen, ohne die Live-Agentensitzung auszulösen:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```


`oma hook run` beendet sich immer mit 0 (fail-open). Leere Standardausgabe bedeutet, dass die Kette für dieses Ereignis keine Aktion ausgeführt hat. Wenn ein Handler auslöst, wird das JSON im Dialekt des Anbieters (oder für Kiro einfacher Text) nach stdout geschrieben.

#### Migration von Installationen vor 0.19

Bestehende Installationen mit den alten Einträgen `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` werden automatisch migriert, sobald Sie `oma install`, `oma update` oder `oma link` erneut ausführen. Der Installer ersetzt nur OMA-verwaltete Hook-Gruppen anhand von Markern (erkennbar an ihren `name`-/`command`-Mustern); von Ihnen hinzugefügte Hook-Gruppen bleiben in ihrer ursprünglichen Reihenfolge erhalten. Der Pfad für `statusLine` bzw. HUD bleibt unverändert. Die prozessinterne Pi-Bridge ist davon nicht betroffen. Siehe `cli/commands/hook/command.ts` für die Router-Implementierung (intern als „Design 019“ bezeichnet) und `cli/platform/hooks-composer/` für die Materialisierungslogik pro Anbieter.

### skills/

Symlinks auf `.agents/skills/`. Dadurch werden Skills für IDEs sichtbar, die aus `.claude/skills/` lesen, während `.agents/` die einzige Wahrheitsquelle bleibt.

### agents/

Subagentendefinitionen im Format für das Agent-Tool von Claude Code. Sie verweisen auf die Skill-Dateien und enthalten die Vorlage für das `CHARTER_CHECK`.

---

## `.agents/state/memories/`: Laufzeitstatus {#agentsstatememories-runtime-state}

Hier schreiben Agenten während Orchestrierungssitzungen ihren Fortschritt. Dies ist der kanonische Koordinationsspeicher; die CLI löst ihn zuerst auf und verwendet für Projekte, die vor der Umstellung erstellt wurden, ersatzweise `.serena/memories/`. Sitzungs- und Aufgabenboarddateien enthalten die Sitzungs-ID; Fortschritts- und Ergebnisdateien enthalten Agent-, Aufgaben-, Lauf- und Sitzungs-ID. Dashboards überwachen dieses Verzeichnis in Echtzeit.

| Datei | Eigentümer | Zweck |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Sitzungsmetadaten: ID, Status, Startzeit, aktuelle Phase |
| `task-board-{sessionId}.md` | Orchestrator | Aufgabenzuweisungen: Agent, Aufgabe, Priorität, Status, Abhängigkeiten |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Dieser Lauf | Schrittweise Updates: durchgeführte Aktionen, gelesene/geänderte Dateien, aktueller Status |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Dieser Lauf | Endausgabe: Abschlussstatus, Zusammenfassung, geänderte Dateien, Checkliste der Akzeptanzkriterien |
| `session-metrics.md` | Orchestrator | Wesentliche Korrekturen und Versuchsbelege |
| `experiment-ledger.md` | Orchestrator/QA | Belegzeilen für tatsächliche Versuche |
| `session-work.md` | Work-Workflow | Sitzungsstatus des Work-Workflows |
| `session-ultrawork.md` | Ultrawork-Workflow | Sitzungsstatus des Ultrawork-Workflows |
| `session-cost-{sessionId}.md` | System | Kostentelemetrie pro Sitzung |
| `archive/metrics-{date}.md` | System | Archivierte Sitzungsmetriken (Aufbewahrung 30 Tage) |

Pfade für Memory-Dateien und Toolnamen können in `.agents/mcp.json` über `memoryConfig` konfiguriert werden.

Serenas eigene Onboarding-Memories (`code_style.md`, `project_purpose.md` und ähnliche Wissensdateien) bleiben in `.serena/memories/` und sind von diesen Koordinationsartefakten getrennt.

---

## Struktur des oh-my-agent-Quell-Repositorys {#oh-my-agent-source-repository-structure}

Wenn Sie selbst an oh-my-agent arbeiten und es nicht nur verwenden, ist das Repository ein Monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```


Im Quell-Repository dürfen `.agents/`-Dateien geändert werden; dies ist die SSOT-Ausnahme für das Quell-Repository selbst. Die `.agents`-Regeln, die Änderungen an diesem Verzeichnis untersagen, gelten für Consumer-Projekte, nicht für das oh-my-agent-Repository.

Entwicklungsbefehle (vom Repository-Stammverzeichnis aus):

- `bun run test`: CLI-Tests (vitest)
- `bun run lint`: CLI- und Web-Workspaces linten
- `bun run build`: CLI-Build
- `bun run typecheck`: CLI und Web typprüfen
- Commits müssen dem Format für Conventional Commits folgen (durch commitlint erzwungen)
