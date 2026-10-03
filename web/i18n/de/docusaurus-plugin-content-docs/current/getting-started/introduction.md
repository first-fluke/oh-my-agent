---
title: Einführung
description: "Ein umfassender Überblick über oh-my-agent: das Multi-Agenten-Orchestrierungsframework, das KI-Coding-Assistenten mit 33 Skill-Paketen, 12 Subagent-Definitionen, progressivem Skill-Laden und IDE-übergreifender Portabilität in spezialisierte Engineering-Teams verwandelt."
---

# Einführung

oh-my-agent ist ein Multi-Agenten-Orchestrierungsframework für KI-gestützte IDEs und CLI-Tools. Statt sich für alles auf einen einzelnen KI-Assistenten zu verlassen, verteilt oh-my-agent die Arbeit auf 33 Skill-Pakete und 13 kanonische Dispatch-Rollen. Zwölf eingecheckte Subagent-Definitionsdateien stellen wiederverwendbare Personas für Implementierung, Review, Planung, Debugging, Dokumentation, Recherche und Infrastruktur bereit. `research-explorer.md` ist der kanonischen Rolle `explore` zugeordnet; `orchestrator` ist eine reine Laufzeitrolle für die Koordination ohne eigene Definitionsdatei.

OMA führt mechanische Prüfungen aus, wenn Sie sie aufrufen oder einen Workflow mit solchen Prüfungen auswählen. `oma verify agent <agent-type>` prüft den ausgewählten Agententyp; `/ralph` ergänzt artefaktbasierte Verifikation und eine Judge-Schleife; aktivierte Vendor-Stop-Hooks können einen Workflow offenhalten, während seine konfigurierten Prüfungen laufen. Das Laden eines Skills begründet allein noch keine Abnahme, und ein einfacher Prompt führt nicht automatisch jedes Workflow-Gate aus. Entscheiden Sie anhand der Akzeptanzkriterien des Workflows und der erzeugten Dateien, was abgeschlossen ist.

Das gesamte System liegt in einem portablen `.agents/`-Verzeichnis innerhalb Ihres Projekts. Sie können zwischen Claude Code, Codex CLI, Antigravity CLI oder IDE, Cursor, OpenCode und anderen unterstützten Tools wechseln; Ihre Agentenkonfiguration bleibt bei Ihrem Code.

Wenn Sie OMA noch nicht kennen, beginnen Sie mit dem [Schnellstart](./quick-start.md) und lesen Sie danach die [wichtigen Standardwerte](./important-defaults.md). Die Installation erstellt die SSOT und Vendor-Integrationen; die erste sinnvolle Prüfung ist `oma doctor`, die erste sinnvolle Aufgabe eine kleine Änderung in einer einzelnen Domäne. Wechseln Sie erst zu `/work` oder `/orchestrate`, wenn die Aufgabe Koordination benötigt.

---

## Das Multi-Agenten-Paradigma {#the-multi-agent-paradigm}

Herkömmliche KI-Coding-Assistenten bearbeiten Frontend, Backend, Datenbank, Sicherheit und Infrastruktur häufig aus einem einzigen Prompt-Kontext. Daraus können folgende Probleme entstehen:

- **Kontextverwässerung:** Wissen für jede Domäne zu laden, verbraucht das Kontextfenster.
- **Unklare Zuständigkeit:** Eine domänenübergreifende Aufgabe hat keine ausdrückliche Grenze für die einzelnen Teile.
- **Manuelle Koordination:** Komplexe Features über mehrere Domänen benötigen Übergaben, die der Host oder die Benutzer auswählen müssen.

oh-my-agent löst das durch Spezialisierung:

1. **Jeder Skill hat eine primäre Domäne.** Der Frontend-Skill kennt React/Next.js, shadcn/ui, TailwindCSS v4 und FSD-lite-Architektur. Der Backend-Skill kennt das Repository-Service-Router-Muster, parametrisierte Abfragen und JWT-Authentifizierung. Domänen können sich an Grenzen überschneiden; verwenden Sie deshalb die Akzeptanzkriterien der Aufgabe, um zu entscheiden, wann ein zweiter Skill oder ein koordinierender Workflow nötig ist.
2. **Agenten können parallel laufen.** Während ein Backend-Agent eine API erstellt, kann ein Frontend-Agent in seinem eigenen Workspace arbeiten. Der Orchestrator koordiniert über dauerhafte, laufbezogene Dateien und Ausführungsnachweise.
3. **Qualitätsleitlinien sind eingebaut.** Skills enthalten domänenspezifische Checklisten, Fehler-Playbooks und Charter-Regeln. Das Charter-Preflight grenzt den Umfang ein, bevor Code geschrieben wird; ein QA-Review läuft, wenn der ausgewählte Workflow es vorsieht oder Sie es anfordern.

---

## Der aktuelle Katalog: 33 Skills, 12 Definitionen, 21 Workflows {#the-current-catalog-33-skills-12-definitions-21-workflows}

Der Katalog trennt drei Dinge, die leicht verwechselt werden:

- **Skills** sind die 33 Domänenwissenspakete unter `.agents/skills/*/SKILL.md`. Sie routen anhand der natürlichsprachlichen Absicht und laden Ressourcen schrittweise.
- **Agentendefinitionen** sind die 12 Dateien unter `.agents/agents/`. Sie stellen Vendor-native Subagent-Personas bereit und verweisen auf einen oder mehrere Skills.
- **Workflows** sind die 21 Prozessdefinitionen unter `.agents/workflows/`. Vier davon sind persistent (`orchestrate`, `work`, `ultrawork` und `ralph`); die übrigen erstellen einen Bericht und halten den persistenten Modus nicht aktiv.

Die folgenden Abschnitte bewahren den detaillierten Skill-Katalog. Wenn sich ein Name oder eine Beschreibung ändert, ist das Frontmatter der aktuellen `SKILL.md` maßgeblich.

Die 12 eingecheckten Definitionsdateien decken über Aliase 13 Laufzeitrollen ab: `research-explorer.md` ist der Rolle `explore` zugeordnet, während `orchestrator` nur zur Laufzeit existiert. Die übrigen Definitionsdateien entsprechen den in [Agenten](../core-concepts/agents.md) aufgeführten Rollen.

### Ideenfindung, Architektur und Planung

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-brainstorm** | Designorientierte Ideenfindung | Erkundet die Benutzerabsicht, schlägt 2–3 Ansätze mit Trade-off-Analyse vor und erstellt vor jedem Code ein Designdokument. 6-Phasen-Workflow: Kontext, Fragen, Ansätze, Design, Dokumentation, Überleitung zu `/plan`. |
| **oma-architecture** | Spezialist für Systemarchitektur | Modul-, Service- und Zuständigkeitsgrenzen, Trade-off-Analyse und Synthese von Stakeholder-Anforderungen. Methoden: diagnostisches Routing, Design-Twice-Vergleich, ATAM-Risikoanalyse, CBAM-Priorisierung und ADR-Entscheidungsprotokolle. Standardmäßig kostenbewusst. |
| **oma-pm** | Produktmanager | Zerlegt Anforderungen mit Abhängigkeiten in priorisierte Aufgaben, definiert API-Verträge und erzeugt `.agents/results/plan-{sessionId}.json` sowie ein sitzungsbezogenes Aufgabenboard. Unterstützt ISO-21500-Konzepte, ISO-31000-Risikobetrachtung und ISO-38500-Governance. |

### Implementierung

| Agent | Rolle | Tech-Stack und Ressourcen |
|-------|------|--------------------------|
| **oma-frontend** | UI/UX-Spezialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui und FSD-lite-Architektur. Bibliotheken: luxon (Datumswerte), ahooks oder @mantine/hooks (Hooks), es-toolkit (Hilfsfunktionen), Jotai/Zustand (Client-Zustand), TanStack Query über orval-generierte Hooks (Server-Zustand), @tanstack/react-form + Zod (Formulare), better-auth (Authentifizierung), nuqs (URL-Zustand). Ressourcen: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md`, `checklist.md`. |
| **oma-backend** | API- und Server-Spezialist | Clean Architecture (Router-Service-Repository-Modelle). Stack-agnostisch; erkennt Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET anhand von Projektmanifesten. JWT + Argon2id für Authentifizierung. Ressourcen: `execution-protocol.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Unterstützt `/stack-set` zum Erzeugen sprachspezifischer `stack/`-Referenzen. |
| **oma-mobile** | Plattformübergreifende Mobile-Entwicklung | Flutter, Dart, Riverpod/Bloc für Zustandsverwaltung, Dio mit Interceptors für API-Aufrufe und GoRouter für Navigation. Clean Architecture: Domäne–Daten–Präsentation. Material Design 3 (Android) und iOS HIG. Ziel sind 60 fps. Unterstützt außerdem natives Swift-iOS: SwiftUI + `@Observable` (iOS 17+), Apples `swift-openapi-generator` für API-Clients und das Layout `App/Core/Features/Shared`. Ressourcen: `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md`, `error-playbook.md`; plattformspezifische Varianten werden durch `/stack-set` materialisiert. |
| **oma-db** | Datenbankarchitektur | Modellierung von SQL-, NoSQL- und Vektordatenbanken. Schema-Design (3NF als Standard), Normalisierung, Indizierung, Transaktionen, Kapazitätsplanung und Backup-Strategie. Unterstützt ISO-27001/27002/22301-bewusstes Design. Ressourcen: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-design** | Spezialist für Designsysteme | Erstellt DESIGN.md mit Tokens, Typografie, Farbsystemen, Motion Design (motion/react, GSAP, Three.js), responsiven Layouts und WCAG-2.2-Konformität. 7-Phasen-Workflow: Setup, Extraktion, Anreicherung, Vorschlag, Generierung, Audit, Übergabe. Erzwingt Anti-Patterns (kein „KI-Kitsch“). Optionale Stitch-MCP-Integration. Ressourcen: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md` sowie ein `reference/`-Verzeichnis mit Leitfäden zu Typografie, Farbe, Raum, Bewegung, Responsivität, Komponenten, Barrierefreiheit und Shadern. |

### Infrastruktur, DevOps und Observability

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-Code | Multi-Cloud-Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first-Authentifizierung, minimale IAM-Berechtigungen, Policy-as-Code (OPA/Sentinel) und Kostenoptimierung. Unterstützt ISO/IEC-42001-KI-Kontrollen, ISO-22301-Kontinuität und ISO/IEC/IEEE-42010-Architekturdokumentation. Ressourcen: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automatisierung von Monorepo-Aufgaben | mise Task Runner, CI/CD-Pipelines, Datenbankmigrationen, Release-Koordination, Git-Hooks und Pre-Commit-Validierung. Ressourcen: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | Intent-basierter Observability-Router | MELT+P-Signalabdeckung (Metriken, Logs, Traces, Profile, Kosten, Audit, Datenschutz), Transport-Tuning (UDP/MTU, OTLP gRPC vs. HTTP, Collector-Topologie, Sampling), W3C-Trace-Context-Propagation, SLO-Management und Burn-Rate-Alerts, Incident-Forensik (Lokalisierung in sechs Dimensionen) und Meta-Observability (Self-Health, Uhrensynchronisation, Kardinalität, Retention). CNCF-first; Fluentd ist veraltet (Fluent Bit oder OTel Collector verwenden). |

### Qualität und Debugging

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-qa** | Qualitätssicherung | Sicherheitsaudit (OWASP Top 10), Performance-Analyse, Barrierefreiheit (WCAG 2.2 AA) und Codequalitäts-Review. Schweregrade: CRITICAL/HIGH/MEDIUM/LOW mit Datei:Zeile und Behebungscode. Unterstützt ISO/IEC 25010 und die Testausrichtung nach ISO/IEC 29119. Ressourcen: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Fehlerdiagnose und -behebung | Reproduzieren-zuerst-Methodik, Grundursachenanalyse, minimale Korrekturen, obligatorische Regressionstests und Suche nach ähnlichen Mustern. Verwendet Code-Intelligence-MCP-Tools (Gortex oder Serena) zur Symbolverfolgung. Ressourcen: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |
| **oma-refactor** | Verhaltenserhaltendes Refactoring | Sichere schrittweise Umstrukturierung mit Charakterisierungstests als Schutz. Hotspot-Auswahl (Komplexität × Änderungsrate), Code-Smell-/SATD-Auswahl, Rückkehr nach der Mikado-Methode bei Fehlschlag, Expand-Contract für zustandsbehaftete Änderungen und reine Refactoring-Commits ohne Verhaltensänderung. Engine-first-Transformationen (IDE-Umbenennung, jscodeshift/ast-grep), Metriken über `uvx lizard` / `uvx radon`. Lesbarkeit ist das Ziel; Metriken sind nur Näherungen. |

### Lokalisierung, Koordination und Git

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-translation** | Kontextbewusste Übersetzung | Sechs-Szenen-Ablauf: Prepare, Acquire, Reason, Act, Verify, Finalize. Die Übersetzungsmethode liest Bedeutung und geschützte Syntax, wählt das Register, rekonstruiert in der Zielsprache und bewahrt den passenden Autorenstil. Zielsprachprofile (`resources/lang/{code}.md`) enthalten Register- und Typografieregeln. Ressourcen: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestration** | Automatisierte Multi-Agenten-Koordination | Startet CLI-Subagenten parallel, koordiniert über dauerhafte Sitzungs-, Aufgabenboard-, Fortschritts- und Ergebnisdateien und überwacht Verifikationsschleifen. Konfigurierbar: MAX_PARALLEL (Standard 3), MAX_RETRIES (Standard 2), POLL_INTERVAL (Standard 30 s). Enthält Agenten-zu-Agenten-Review und optionale Sitzungsbelege. Ressourcen: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Software Configuration Management (SCM) und Git | Behandelt Branching-, Merge-/Rebase-/Konflikt-Workflows, Worktrees, Baselines und Release-Zustände. Unterstützt außerdem Conventional-Commit-Nachrichten mit sicherem Staging; Co-Author-Trailer stammen bei Aktivierung aus der wirksamen Konfiguration `scm.co_author`. |
| **oma-coordination** | Anleitung für manuelle Multi-Agenten-Workflows | Schrittweise Koordination von PM-, Frontend-, Backend-, Mobile- und QA-Agenten über `oma agent spawn`. Beginnt mit PM-Zerlegung, startet gleich priorisierte Aufgaben in getrennten Workspaces, überwacht laufbezogene Fortschritts-/Ergebnisdateien, stimmt API- und Datenverträge vor Frontend-/Mobile-Arbeit ab und endet mit dem QA-Review. Das manuelle Gegenstück zu `oma-orchestration`. |

### Suche, Retrospektive und Dokumentverarbeitung

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-search** | Intent-basierter Such-Router | Leitet Anfragen an Context7 (Dokumente), native Websuche, `gh`/`glab` (Code) und lokale Code-Intelligence (Gortex oder Serena). Bewertet das Domänenvertrauen aller nicht lokalen Ergebnisse. Fail-forward-Routing (docs→web→fetch). Flags: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Werkzeugübergreifende Arbeitsretrospektive | Analysiert Konversationshistorien aus Grok, Claude, Codex, Gemini, Qwen, Cursor und Antigravity. Löst natürlichsprachliche Datums-/Zeitraumangaben auf, gruppiert nach Tool und Sitzung, extrahiert Themen, erzeugt Tages-/Zeitraumberichte und vermerkt, wenn die CLI einen angeforderten Zeitraum auf 30 Tage begrenzt. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Konvertiert koreanische Textverarbeitungsdokumente über `bunx kordoc@latest`. Bewahrt Überschriften, Tabellen (auch verschachtelte), Fußnoten, Hyperlinks und Bilder. Entfernt Hancom-Private-Use-Area-Zeichen mit dem Nachbearbeiter `flatten-tables.ts`. |
| **oma-pdf** | PDF → Markdown | Konvertiert PDF-Dokumente über `uvx opendataloader-pdf`. Bewahrt Überschriften, Tabellen, Listen und Bilder; Hybrid-OCR für gescannte PDFs; Ausgabe wird mit `uvx mdformat` normalisiert. |

### Wissenschaftliches und akademisches Schreiben

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-academic-writing** | Publikationsfähige englische Prosa | Erstellt, überarbeitet und prüft Essays, Berichte, Management-Zusammenfassungen, Schlussfolgerungen und Literaturübersichten. Erzwingt gleichzeitig vier Protokolle: Satzstruktur (4 Typen, wechselnde Länge und Einstiege), Verben (verbotene generische Verben werden aus einem abgestuften akademischen Korpus ersetzt), Hedging (Stärke an die Evidenz angepasst) und Anti-KI-Konformität. Rubrik-Gate „Zitat vor Urteil“, Claim-Evidence-Map und Reverse Outlining. Modi: `draft` / `revise` / `review`. |
| **oma-scholar** | Begleiter für wissenschaftliche Paper-Sidecars | Sucht, erzeugt, validiert, prüft und vergleicht wissenschaftliche Arbeiten über die Knows-Sidecar-Spezifikation `.knows.yaml` (v0.9.0 / `paper@1`). Anspruchs-, Evidenz- und Beziehungszugriff ist tokeneffizient (~700 Tokens nur für Claims gegenüber ~10K für das vollständige PDF). `oma scholar search/resolve/get/lint` nutzt knows.academy mit automatischem OpenAlex-Fallback für Arbeiten vor 2026. Gegen Erfindungen werden unbekannte Felder ausgelassen statt geraten. |

### Sicherheit

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-deepsec** | Treiber für agentenbasiertes Schwachstellen-Scanning | Bedient Vercels `deepsec` (`bunx deepsec`) von Anfang bis Ende: führt `init` für den `.deepsec/`-Workspace aus, schreibt eine projektspezifische `INFO.md`, führt kostenbewusste `scan`-/`process`-/`triage`-/`revalidate`-/`export`-Durchläufe aus, sperrt Pull Requests über `process --diff` mit einem Zwei-Job-CI-Muster und erstellt eigene Matcher. Kalibriert mit `--limit 50 --concurrency 5` vor einem großen Lauf und nennt vor kostenpflichtiger Arbeit eine Dollarprognose; die Kosten hängen von Repositorygröße und Backend ab. Agenten-Backends: `codex` (gpt-5.5) oder `claude` (claude-opus-4-8). |

### Dokumentation und Meta-Tooling

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-docs** | Prüfer für Dokumentationsdrift | Der Modus `verify` prüft `docs/**/*.md` deterministisch auf defekte Verweise (Pfade, CLI-Befehle, Konfigurationsschlüssel, Umgebungsvariablen, Skripte) und beendet sich mit 0/1; der Modus `sync` ordnet einen Git-Diff möglichen Dokumenten zu und erstellt vom Host-LLM formulierte Patch-Vorschläge, die pro Dokument bestätigt werden (keine automatische Anwendung). URL-Prüfung delegiert an `lychee`; die CLI gibt strukturiertes JSON aus, die Synthese übernimmt das Host-LLM (keine Vendor-SDK-Aufrufe). `.agents/` wird nie geändert. |
| **oma-skill-creation** | Spezialist für SSL-lite-Skill-Autorenschaft | Erstellt, aktualisiert und prüft OMA-Skills im SSL-lite-Format mit den vier Pflichtabschnitten (Scheduling / Structural Flow / Logical Operations / References). Klassifiziert den Skill-Typ, fügt genau einen kanonischen Inline-Pfad ein, erzwingt `When NOT to use`-Querverweise und führt `oma skill audit` aus, um Beschreibungsüberschneidungen zu erkennen (Warnung ab 60 %, Fehler ab 75 % TF-IDF-Kosinus). Verschiebt lange Varianteninformationen in `resources/`. |
| **oma-explanation** | Erklärer für Codeänderungen | Wandelt einen Diff, PR, Branch oder Commit-Bereich in ein eigenständiges Offline-HTML-Dokument mit den Abschnitten Background, Intuition, Code und Quiz um. Der Workflow `/explain` validiert das Artefakt und schreibt es unter `.agents/results/explain/`. |

### Marktforschung

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-market** | Intelligence für Community-Signale | Führt die Upstream-Engine `last30days` (Reddit mit echten Upvotes und Kommentaren, X, YouTube-Transkripte, TikTok, HN, Polymarket, GitHub, arXiv, Techmeme, Bluesky, Web und mehr) über `oma market run` aus. oma hält die Engine **immer auf dem neuesten Release** (`~/.cache/oma-market/`), sperrt jeden Lauf über `detect-trap`, klassifiziert die Absicht (Pain / Trend / Competitor / Discovery) und ergänzt SWOT-, Porters-5F- und PESTEL-Abschnitte. Erzeugt ein LAW-konformes Briefing unter `.agents/results/market/{slug}-{YYYYMMDD}.md`. |

### Medien- und Content-Erzeugung

| Agent | Rolle | Kernfähigkeiten |
|-------|------|-----------------|
| **oma-image** | Multi-Vendor-Bildrouter | Authentifizierungsbewusster paralleler Dispatch an Codex (`gpt-image-2` über ChatGPT OAuth, CLI-first), Gemini-Familienmodelle von Antigravity über die `agy`-CLI + Gemini Code Assist (das konkrete Modell wird intern gewählt) und Pollinations (kostenlose `flux`/`zimage`). Klärungs-/Verstärkungsprotokoll vor der Erzeugung, bis zu 10 Referenzbilder, Kostenbegrenzung (Bestätigung ab ≥ $0.20), `manifest.json` zur Reproduzierbarkeit. CLI: `oma image generate`, `oma image doctor` und `oma image vendor list`. |
| **oma-slide** | Generator für animationsreiche HTML-Decks | Erzeugt eigenständige Präsentationsdecks auf einer festen Bühne von 1920×1080, validiert Geometrie deterministisch, bündelt zu einer einzelnen HTML-Datei und exportiert über die CLI `oma slide` nach PDF/PNG/PPTX. Stil-Presets und markante Templates, CJK→Pretendard-Regel, `prefers-reduced-motion` und sichtbarer Fokus sind erforderlich; maximal drei automatische Validierungs-/Reparaturschleifen. Bilder kommen über `oma-image`; optional ist Canva-MCP-Export/Import. |
| **oma-video** | Router für Shorts, Explainer und Demos | Erstellt Shorts/Reels (9:16), Explainer (16:9) und aufgezeichnete Demos (16:9) über die CLI `oma video`. Der deterministische Asset-Bus (`script.json` → `timing.json` → `render-spec.json`) speist einen verwalteten HyperFrames-Kompositor; Provider dürfen lokale Fallbacks verwenden, während fehlende Komposition/Toolchain oder Renderfehler den Lauf fehlschlagen lassen. Menschliche Aufnahmen automatisieren niemals Zugangsdaten. |
| **oma-voice** | Lokales TTS und STT | Steuert den Voicebox-MCP-Server für On-Device-Benachrichtigungen, TTS für Assets und Transkription ohne Cloud-Aufrufe oder Kosten pro Aufruf. TTS verwendet standardmäßig WAV und kann lokal nach MP3 transkodiert werden; Transkription akzeptiert Audio-Pfade oder Base64. TTS-Aufrufe sind auf 5000 Zeichen, STT-Eingaben auf 30 Minuten begrenzt; gespeicherte Asset-/Transkriptionsläufe schreiben ein Manifest. |

---

## Progressives Offenlegungsmodell {#progressive-disclosure-model}

oh-my-agent verwendet eine Zwei-Schichten-Skill-Architektur, damit das Kontextfenster nicht erschöpft wird:

**Schicht 1: SKILL.md (Median ~3.100 Tokens, beim Routing des Skills geladen)**
Enthält Identität des Agenten, Routing-Bedingungen, Kernregeln und Hinweise zu „wann verwenden / wann NICHT verwenden“. Das ist alles, was geladen wird, wenn der Agent nicht aktiv arbeitet.

**Schicht 2: resources/ (bei Bedarf geladen)**
Enthält Ausführungsprotokolle, Tech-Stack-Referenzen, Code-Snippets, Fehler-Playbooks, Checklisten und Beispiele. Diese Ressourcen werden erst beim Aufruf des Agenten für eine Aufgabe und dann nur für den jeweiligen Aufgabentyp geladen (abhängig von Schwierigkeitsbewertung und Zuordnung in `context-loading.md`).

Gemessen über eine Sitzung mit fünf Agenten benötigt der Skill-Kontext bei einer einfachen oder mittleren Aufgabe ungefähr 17–19K Tokens bei einem Limit von 72K; etwa 75 % des Maximums werden vermieden. Bei komplexen Aufgaben, die Stack-Referenzen laden, sinkt der vermiedene Anteil auf etwa 47 %. Die [Berechnung der Token-Einsparung](../core-concepts/skills.md#token-savings-math) enthält die Messtabelle und das reproduzierende Skript.

---

## .agents/: die einzige Wahrheitsquelle (SSOT) {#.agents-the-single-source-of-truth-ssot}

Alles, was oh-my-agent benötigt, befindet sich im Verzeichnis `.agents/`:

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

Das `.claude/`-Verzeichnis ist ausschließlich eine IDE-Integrationsschicht. Es enthält Symlinks zurück auf `.agents/` sowie Hooks für Keyword-Erkennung und HUD-Statuszeile. `.agents/state/memories/` enthält den Laufzeit-Koordinationszustand während Orchestrierungssitzungen; ältere Projekte fallen auf den Legacy-Pfad `.serena/memories/` zurück.

Diese Architektur macht Ihre Agentenkonfiguration:
- **Portabel:** Sie können die IDE wechseln, ohne neu zu konfigurieren.
- **Versionskontrolliert:** Committen Sie `.agents/` zusammen mit Ihrem Code.
- **Teilbar:** Teammitglieder erhalten dasselbe Agenten-Setup.

---

## Unterstützte IDEs und CLI-Tools {#supported-ides-and-cli-tools}

oh-my-agent funktioniert mit den ausgewählten KI-gestützten IDEs und CLIs über deren natives Skill-/Prompt-Laden oder erzeugte Integrationsdateien:

| Tool | Integrationsmethode | Parallele Agenten |
|------|---------------------|------------------|
| **Claude Code** | Native Skills + Agent-Tool | Task-Tool für echte Parallelität |
| **Antigravity CLI/IDE** | Skills und MCP-Einstellungen für `agy` projiziert | `oma agent spawn` |
| **Codex CLI** | Skills automatisch geladen | Modellvermittelte parallele Anfragen |
| **Cursor** | Skills über `.cursor/`-Integration | Manuelles Starten |
| **OpenCode** | Skills + In-Process-Plugin-Bridge + erzeugte Subagenten (`.opencode/agents/`) | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | Hooks + Skills in `~/.kimi-code/` (zustimmungsgebundener HOME-Schreibzugriff; liest auch SSOT `.agents/skills/` nativ); projektbezogenes Serena-MCP | `oma agent spawn --vendor kimi` |

Das Starten von Agenten passt sich über Vendor-Erkennung und die aktive Konfiguration an jeden ausgewählten Vendor an. Laufzeiten desselben Vendors können native Subagenten verwenden; domänenübergreifende Arbeit fällt auf `oma agent spawn` zurück. Die Dispatch-Regeln stehen unter [Parallele Ausführung](../core-concepts/parallel-execution.md).

---

## Skill-Routing-System {#skill-routing-system}

Wenn Sie einen Prompt senden, bestimmt oh-my-agent anhand der Skill-Routing-Karte (`.agents/skills/_shared/core/skill-routing.md`), welcher Agent ihn bearbeitet:

| Domänen-Keywords | Weitergeleitet an |
|------------------|-------------------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, Swift, SwiftUI, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestration |

Bei komplexen Anfragen über mehrere Domänen folgt das Routing etablierten Ausführungsreihenfolgen. Beispielsweise wird „Create a fullstack app“ an oma-pm (Plan), danach an oma-backend + oma-frontend (parallele Implementierung) und schließlich an oma-qa (Review) geroutet.

---

## HUD-Statuszeile {#hud-statusline}

Bei der Ausführung in Claude Code zeigt oh-my-agent einen dauerhaften Statusindikator `[OMA]` in der Statuszeile:
- Modellname (z. B. Opus, Sonnet)
- Kontextnutzung mit Farbcodierung (grün < 70 %, gelb 70–85 %, rot > 85 %)
- Aktiver Workflow-Zustand, wenn ein persistenter Workflow läuft

Das HUD wird von `.claude/hooks/hud.ts` über die Claude-Code-Funktion `statusLine` bereitgestellt.

---

## Automatische Workflow-Erkennung {#automatic-workflow-detection}

Sie müssen keinen `/command` eingeben, um Workflows auszulösen. Das Hook-System von oh-my-agent durchsucht Ihre natürlichsprachliche Eingabe anhand der in `.agents/hooks/core/triggers.json` definierten Keyword-Trigger (in die `oma`-Binärdatei eingebettet und von jedem Vendor gemeinsam verwendet). Unterstützt werden 11 Sprachen (Englisch, Koreanisch, Japanisch, Chinesisch, Spanisch, Französisch, Deutsch, Portugiesisch, Russisch, Niederländisch und Polnisch).

- **Handlungsrelevante Eingabe** (z. B. „plan the auth feature“) → lädt den Workflow automatisch.
- **Informative Eingabe** (z. B. „what is orchestrate?“) → wird herausgefiltert, kein Workflow wird ausgelöst.
- **Expliziter `/command`** → der Hook überspringt die Erkennung, damit nichts doppelt ausgelöst wird.
- **Persistente Workflows** injizieren den Kontext bei jeder Nachricht erneut, bis Sie „workflow done“ sagen.

Jedes Hook-Ereignis wird über die kanonische ABI `oma hook run` zugestellt: Der Vendor ruft `oma-hook.sh --vendor <v> --event <nativeEvent>` auf, das die In-Process-Handlerkette ausführt und die Vendor-spezifische Darstellung nach stdout schreibt (immer Exit 0, Fail-open).

---

## Unterstützung mehrerer Vendors {#cross-vendor-support}

oh-my-agent ist nicht auf Claude Code beschränkt. Hook-fähige Vendors verwenden dieselbe ABI `oma hook run`; Erweiterungs-Vendors nutzen ihre In-Process-Bridge:

| Vendor | Hook-Zustellung | StatusLine |
|--------|-----------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (direkt, unverändert) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | — |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun`-Pfad über `ui.statusLine` |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | — |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | — |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | — |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (globales TOML `[[hooks]]` in `~/.kimi-code/config.toml`) | — |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | — |
| **pi** | In-Process-Bridge (`installPiExtension`) — nicht über `oma hook run` geroutet | — |

Das Verzeichnis `.agents/` bleibt die Wahrheitsquelle. Die Installation verlinkt oder projiziert Skills, Workflows, Hooks und Agentendefinitionen in die von Ihnen ausgewählten Vendors; deren Fähigkeiten unterscheiden sich. Native Subagenten desselben Vendors und CLI-gestartete Cross-Vendor-Agenten lesen beide aus dieser Quelle.

---

## Nächste Schritte {#what-is-next}

- **[Installation](./installation.md):** Drei Installationsmethoden, Presets, CLI-Einrichtung und Verifikation
- **[Agenten](/docs/core-concepts/agents):** Vertiefung in die 33 Skills, 13 Dispatch-Rollen und das Charter-Preflight
- **[Skills](/docs/core-concepts/skills):** Erklärung der Zwei-Schichten-Architektur
- **[Workflows](/docs/core-concepts/workflows):** Alle 21 Workflows mit Triggern und Phasen
- **[Nutzungsleitfaden](/docs/guide/usage):** Praxisbeispiele von Einzelaufgaben bis zur vollständigen Orchestrierung
