---
title: Skills
description: Vollständige Anleitung zur Zwei-Schichten-Architektur der 33 OMA-Skills, einschließlich SKILL.md-Routing, bedarfsgesteuerter Ressourcen, gemeinsamer und bedingter Protokolle, Vendor-Ausführung, Token-Messungen und Routing-Mechanik.
---

# Skills

Skills sind strukturierte Wissenspakete, die einer Dispatch-Rolle ihre Domänenleitlinien vermitteln. Sie enthalten Ausführungsprotokolle, Tech-Stack-Referenzen, Code-Vorlagen, Fehler-Playbooks, Qualitätschecklisten und Beispiele, soweit der Skill sie bereitstellt, organisiert in einer Zwei-Schichten-Architektur, die auf Token-Effizienz ausgelegt ist.

---

## Das Zwei-Schichten-Design

### Schicht 1: SKILL.md (beim Routing des Skills geladen)

Jeder Skill hat eine `SKILL.md`-Datei im Stammverzeichnis. Sie gelangt in das Kontextfenster, sobald der Skill geroutet wird — der Injector-Hook übergibt eine **Pfadangabe**, nicht den Inhalt. Ein nicht gerouteter Skill kostet daher außer seiner `description` nichts. Die Datei enthält:

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

Das `resources/`-Verzeichnis enthält ausführliches Ausführungswissen. Diese Dateien werden nur geladen, wenn:
1. Der Host oder Workflow den Skill ausgewählt hat (etwa durch Skill-Matching oder einen ausdrücklichen Befehl)
2. Die aktuelle Aufgabe die Ladebedingung der Referenz erfüllt

Dieses bedarfsgesteuerte Laden wird durch den Context-Loading-Leitfaden (`.agents/skills/_shared/core/context-loading.md`) gesteuert, der zwischen Einstiegsanweisungen und je nach Aufgabe ausgewählten Referenzen unterscheidet.

---

## Beispiel der Dateistruktur

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

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
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Ressourcentypen pro Skill

| Ressourcentyp | Dateinamenmuster | Zweck | Wann geladen |
|--------------|-----------------|---------|-------------|
| **Ausführungsprotokoll** | `execution-protocol.md` | Schritt-für-Schritt-Workflow: Analysieren -> Planen -> Implementieren -> Verifizieren | Die ausgewählte Operation benötigt ihre Befehls- oder Vertragsdetails |
| **Tech-Stack** | `tech-stack.md` | Detaillierte Technologiespezifikationen, Versionen, Konfiguration | Ausgewählte Framework- oder Stack-Entscheidung |
| **Fehler-Playbook** | `error-playbook.md` | Wiederherstellungsverfahren mit "3-Strikes"-Eskalation | Nur bei Fehlern |
| **Checkliste** | `checklist.md` | Domänenspezifische Qualitätsverifikation | Beim Verifikationsschritt |
| **Snippets** | `snippets.md` | Kopierbereite Code-Muster | Ungewohnte Implementierung oder Ausgabeform |
| **Beispiele** | `examples.md` oder `examples/` | Few-Shot-Ein-/Ausgabebeispiele für das LLM | Ungewohnte Implementierung oder Ausgabeform |
| **Varianten** | `variants/`-Verzeichnis | Sprach-/Framework-spezifische Referenzen. Für Backend gibt es `node`, `python` und `rust` als Seeds; Mobile liefert ein Schema und kann generierte Plattformreferenzen erhalten. | Wenn ein passender Stack vorhanden ist |
| **Vorlagen** | `component-template.tsx`, `screen-template.dart` | Boilerplate-Dateivorlagen | Bei Komponentenerstellung |
| **Domänenreferenz** | `orm-reference.md`, `anti-patterns.md` usw. | Vertiefte Domänenkenntnisse für spezifische Teilaufgaben | Aufgabentypspezifisch |

---

## Gemeinsame Ressourcen (_shared/)

Alle Agenten teilen gemeinsame Grundlagen aus `.agents/skills/_shared/`. Diese sind in drei Kategorien organisiert:

### Kernressourcen (`.agents/skills/_shared/core/`)

| Ressource | Zweck | Wann geladen |
|----------|---------|-------------|
| **`skill-routing.md`** | Routet nach Aufgabenergebnis, Zuständigkeit und tatsächlichen Abhängigkeiten; keine zwingende Agentenkette und kein Zugkontingent. | Von Orchestrator- und Koordinations-Skills referenziert |
| **`context-loading.md`** | Zuständige Einstiegsdatei, bedingte Referenzen und Grenzen des Ladens zur Laufzeit. | Beim Zusammenstellen des Kontexts |
| **`prompt-structure.md`** | Gibt Orientierung für ungewohnte Aufgabenübergaben mit Ziel, Kontext, echten Einschränkungen und Akzeptanznachweis; keine verpflichtende Vorlage für direkte Aufgaben. | Von PM-Agent und allen Workflows referenziert |
| **`clarification-protocol.md`** | Klärt Routinedetails anhand des Kontexts und fragt nur nach wesentlichen fehlenden Informationen oder einer Autorisierung. | Bei unklaren Anforderungen |
| **`context-budget.md`** | Dateigrößenschätzungen, Messung des tatsächlichen Prompts, eingegrenzte Lesezugriffe und Checkpoints. | Lange Aufgaben oder Diagnose von Kontext-Overhead |
| **`difficulty-guide.md`** | Wählt Planungstiefe und Liefergegenstände anhand von Abhängigkeiten und Verifikationsbedarf. | Wenn die Zerlegung eine Schwierigkeitsschätzung benötigt |
| **`quality-principles.md`** | Leitlinien zu Umfang, Wartbarkeit, Nachweisen und verhältnismäßiger Verifikation. | Beim Workflow-Start qualitätsorientierter Workflows (ultrawork) |
| **`vendor-detection.md`** | Protokoll zur Erkennung der Laufzeitumgebung (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen und CLI-Fallback). Verwendet Host-Marker und den konfigurierten Vendor-Status. | Beim Workflow-Start |
| **`session-metrics.md`** | Optionale Sitzungsnachweise ohne gesprächs- oder evaluatorbezogene Strafpunkte. | Angeforderte Retrospektive oder wesentliche Korrektur |
| **`common-checklist.md`** | Anwendbare domänenübergreifende Prüfungen; keine globalen Zeilenzahl-Limits und keine pauschale Catch-Pflicht. | Domänenübergreifendes Review, wenn relevant |
| **`lessons-learned.md`** | Erfassen und Anwenden belegter Lessons mit Versions- und Auslösebedingungen; kein automatischer RCA-Schwellenwert. | Nach Fehlern und am Sitzungsende |
| **`api-contracts/`** | Optionale Vertragsvorlage. Projektschemata wiederverwenden; generierte Verträge liegen außerhalb der Skill-Quelle. | Wenn domänenübergreifende Arbeit geplant wird |

### Laufzeit-Ressourcen (`.agents/skills/_shared/runtime/`)

| Ressource | Zweck |
|----------|---------|
| **`memory-protocol.md`** | Speicherdateiformat und Operationen für CLI-Subagenten. Definiert Protokolle für Start, Ausführung und Abschluss mit konfigurierbaren Speicherwerkzeugen sowie eine Erweiterung zur Experimentverfolgung. |
| **`execution-protocols/claude.md`** | Claude-Code-spezifische Ausführungsmuster. Wird von `oma agent spawn` bei Vendor `claude` injiziert. |
| **`execution-protocols/antigravity.md`** | Ausführungsmuster für die Antigravity-CLI (`agy`). |
| **`execution-protocols/codex.md`** | Codex-CLI-spezifische Ausführungsmuster. |
| **`execution-protocols/commandcode.md`** | Ausführungsmuster für CommandCode. |
| **`execution-protocols/grok.md`** | Ausführungsmuster für Grok. |
| **`execution-protocols/kimi.md`** | Ausführungsmuster für Kimi Code. |
| **`execution-protocols/kiro.md`** | Ausführungsmuster für Kiro. |
| **`execution-protocols/opencode.md`** | Ausführungsmuster für die OpenCode-Erweiterung. |
| **`execution-protocols/pi.md`** | Ausführungsmuster für die pi-Erweiterung. |
| **`execution-protocols/qwen.md`** | Qwen-CLI-spezifische Ausführungsmuster. |

Vendor-spezifische Ausführungsprotokolle werden für per CLI gestartete Agenten automatisch durch `oma agent spawn` injiziert. Native Subagenten verwenden die Integrationsregeln des ausgewählten Vendors.

### Bedingte Ressourcen (`.agents/skills/_shared/conditional/`)

Diese werden nur geladen, wenn bestimmte Bedingungen während der Ausführung erfüllt sind:

| Ressource | Auslösebedingung | Geladen von |
|----------|-------------------|-----------|
| **`quality-score.md`** | Eine definierte Baseline oder ein Experimentvergleich wird benötigt | Orchestrator (wird an QA-Agent-Prompt übergeben) |
| **`experiment-ledger.md`** | Erstes Experiment wird aufgezeichnet, nachdem eine IMPL-Baseline etabliert wurde | Orchestrator (inline, nach Baseline-Messung) |
| **`exploration-loop.md`** | Wiederholte Wiederherstellungsversuche scheitern und es lohnt sich, Alternativen im Rahmen des Budgets zu testen | Orchestrator (inline, vor dem Starten von Hypothesen-Agenten) |

Diese Ressourcen bleiben zurückgestellt, bis ihre jeweiligen Auslöser zutreffen. Der Schwierigkeitsgrad allein injiziert sie nicht.

---

## Wie Skills über skill-routing.md geroutet werden

Die Skill-Routing-Karte definiert, wie Aufgaben Agenten zugeordnet werden:

### Einfaches Routing (einzelne Domäne)

Ein Prompt mit "Build a login form with Tailwind CSS" stimmt mit den Keywords `UI`, `component`, `form`, `Tailwind` überein und wird an **oma-frontend** weitergeleitet.

### Routing komplexer Anfragen

Multi-Domänen-Anfragen folgen etablierten Ausführungsreihenfolgen:

| Anfragemuster | Ausführungsreihenfolge |
|----------------|----------------|
| "Erstelle eine Fullstack-App" | oma-pm -> (oma-backend + oma-frontend) parallel -> oma-qa |
| "Erstelle eine Mobile-App" | oma-pm -> (oma-backend + oma-mobile) parallel -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> relevante Agenten -> oma-qa |
| "Do everything automatically" | oma-orchestration (intern: oma-pm -> Agenten -> oma-qa) |

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

## Token-Einsparungsberechnung {#token-savings-math}

Erst messen, dann Einsparungen behaupten:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

Das Skript meldet Schätzwerte (UTF-8-Bytes / 4) für Dateigrößen-Szenarien. `routed` umfasst nur die Einstiegsdatei; `simple`, `medium` und `complex` fügen zum Vergleich hypothetische Protokoll-, Beispiel- und Stack-Dateien hinzu. Ihre Namen bleiben aus Gründen der Skriptkompatibilität erhalten und sind keine Anweisungen zum Vorladen. `all` ist eine Obergrenze der Ressourcengröße, keine Laufzeitkonfiguration. Ein frischer Checkout kann einen einzelnen Plattform-Seed als Größenproxy verwenden; dabei werden nicht alle Plattformen geladen.

Der Context-Befehl zeigt an, was tatsächlich als Aufgabenkontext injiziert wird. Er enthält weder den übrigen Gesprächsverlauf noch sämtliche Host- und Laufzeitanweisungen. Gesamte Eingabe-Tokens, Latenz und Kosten für ein konkret benanntes Modell mit einem zusammengestellten Prompt oder mit Nutzungstelemetrie messen. Diese Werte nicht aus der Repository-Größe oder aus der Anzahl generierter Spiegelkopien ableiten.

## Ressourcenladen nach Aufgabe {#resource-loading-by-task}

Jede Schwierigkeitsstufe beginnt mit dem zuständigen Skill. Der Graph ist ein Referenzindex; Nachbarschaft im Graphen berechtigt nicht zum Laden eines anderen Spezialisten, eines Fehler-Playbooks oder eines bedingten Experiment-Workflows.

Der Loader verwendet weiche Budgets von 1.500 / 4.000 / 8.000 geschätzten Tokens für Simple / Medium / Complex. Eine Einstiegsdatei, die das Budget überschreitet, bleibt erhalten, und die Überschreitung wird gemeldet. Unterstützende Referenzen bleiben zurückgestellt, es sei denn, sie werden ausdrücklich ausgewählt, nachdem ihr aufgabenbezogener Auslöser geklärt wurde. Eine erforderliche Einstiegsdatei wird nie durch kleinere, nicht zugehörige Dokumente ersetzt.

Die Verifikation richtet sich nach dem Risiko der Aufgabe und den Projektanforderungen. Eine Schwierigkeitseinstufung verlangt weder eine vollständige Test-Suite noch eine feste Preflight-Antwort noch eine zweite Genehmigung bereits autorisierter Arbeit.

## Context-Loading-Aufgabenzuordnungen (pro Agent)

Dies sind Beispiele für Referenzen, die herangezogen werden, wenn die Aufgabe sie benötigt. Den aktuellen Index des zuständigen Skills verwenden und nur anwendbare Abschnitte auswählen:

### Backend-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| CRUD-API-Erstellung | passende `variants/{node,python,rust}/snippets.md`, sofern vorhanden |
| Authentifizierung | passende `snippets.md`-Variante + `tech-stack.md`, sofern vorhanden |
| DB-Migration | passende `snippets.md`-Variante, sofern vorhanden |
| Performance-Optimierung | `orm-reference.md` und passende vom Skill bereitgestellte Beispiele |
| Vorhandenen Code modifizieren | projektweiter Code-Intelligence-Provider und relevante Ausführungsressourcen |

### Frontend-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| Komponentenerstellung | snippets.md + vorhandene Komponenten-Muster des Projekts |
| Formularimplementierung | snippets.md (Formular + Zod) |
| API-Integration | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Seitenlayout | snippets.md (Grid) |

### Design-Agent

| Aufgabentyp | Erforderliche Ressourcen |
|-----------|-------------------|
| Design-System-Erstellung | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Landingpage-Design | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
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
| Vollständiges Audit | checklist.md (vollständig) + self-check.md |
| Vergleich einer definierten Metrik | quality-score.md (bedingt) |

---

## Orchestrator-Prompt-Zusammenstellung

Wenn der Orchestrator Prompts für Subagenten zusammenstellt, enthält er nur aufgabenrelevante Ressourcen:

1. Pfad der zuständigen SKILL.md (der CLI-Dispatch injiziert den Inhalt bereits)
2. Abschnitt des Ausführungsprotokolls einer ausgewählten Operation, bei Bedarf
3. Ressourcen, die dem spezifischen Aufgabentyp entsprechen (aus den obigen Zuordnungen)
4. Relevanter Abschnitt des Fehler-Playbooks, nur nach einem beobachteten Fehler
5. Memory Protocol (CLI-Modus)

Diese zielgerichtete Zusammenstellung vermeidet unnötige Ressourcen und maximiert den verfügbaren Kontext des Subagenten für die eigentliche Arbeit.

---

## Sitzungsnachweise und retrospektive Auswertung

Sitzungsaufzeichnungen halten wesentliche Korrekturen, Umfangsänderungen, Nacharbeit und beurteilte Review-Befunde mit Nachweisen fest. Notwendige Klärung zieht keine Strafe nach sich. Die früheren gewichteten CD- und EA-Scores sowie die durch Schwellenwerte ausgelösten RCA-Regeln wurden entfernt; sie waren Prompt-Anweisungen und keine per CLI berechneten Metriken.

Nach Möglichkeit vorhandene Aufgabenergebnisse verwenden. Eine separate `session-metrics-{sessionId}.md` ist im konfigurierten Koordinationsspeicher optional. Ein wiederholter Fehlschlag oder eine angeforderte Retrospektive kann eine Lesson rechtfertigen; eine gewöhnliche fehlschlagende Prüfung oder ein strittiger Befund begründet jedoch nicht automatisch eine. Historische Protokolle beibehalten und nicht in das neue Format umschreiben.

`oma stats` meldet die Produktivität sowie erfasste Nutzungs- und Kostenzusammenfassungen. `oma retro` gruppiert tatsächliche Ereignisse (Gate, Blocker, fehlende Entscheidung) zu Vorschlägen. Keiner von beiden berechnet CD-/EA-Scores aus diesen Markdown-Artefakten.

## Aufgabenzerlegung und Kontextwiederherstellung

Die Planung an Abhängigkeiten und unabhängig verifizierbarem Verhalten ausrichten. Feste Sprint-Anzahlen, Dateizahlen und Zugschätzungen bestimmen weder die Review-Tiefe noch den Abschluss. Tests und Fehlerbehandlung bei dem Verhalten belassen, das sie verifizieren.

Bei einem beobachteten Stillstand oder Verlust nützlichen Kontexts vor dem Fortsetzen oder einem erneuten Dispatch abgeschlossene Arbeit, verbleibende Kriterien, relevante Pfade und Verifikationsnachweise speichern. Vorhandene Arbeit erhalten und einen laufenden Versuch nicht duplizieren. Ein Verhältnis von Zügen zu Fortschritt allein erfordert keinen Reset.

## Bedingte Messung und Exploration

Eine definierte Baseline oder ein Experimentvergleich aktiviert die Leitlinien zur Messung; das bloße Vorhandensein von Tests oder Lint tut das nicht. Vergleichbare Metriken mit Einheiten, Methode, Revision und Nachweisen aufzeichnen. Erforderliche Korrektheits- und Sicherheitsprüfungen bleiben davon unabhängig. OMA kennt keine zusammengesetzte Standardformel, kein Gate mit Buchstabennoten und keinen durch Scores ausgelösten Rollback.

Ein tatsächliches Experiment zeichnet seine Hypothese, Baseline- und Kandidatennachweise, erforderliche Prüfungen, Entscheidung und zugeordnete Dateien auf. Wiederholte Fehlschläge können es rechtfertigen, einen anderen Mechanismus innerhalb des bestehenden Wiederherstellungsbudgets zu testen. Experimentänderungen isolieren, nicht zugehörige Änderungen erhalten und den integrierten Kandidaten verifizieren, bevor das Gate fortgesetzt wird.
