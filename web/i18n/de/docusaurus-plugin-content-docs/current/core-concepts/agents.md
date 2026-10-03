---
title: Agenten
description: Referenz für OMA mit 33 Skill-Paketen, 13 kanonischen Dispatch-Rollen und 12 eingecheckten Subagent-Definitionen einschließlich Domänen, Ressourcen, Charter-Preflight, progressivem Laden, Geltungsbereichen, Qualitäts-Gates, Workspace-Strategie, Orchestrierung und Laufzeitspeicher.
---

# Agenten

OMA trennt Skill-Pakete, Dispatch-Rollen und Subagent-Definitionsdateien. Ein Skill routet und lädt Domänenwissen; eine kanonische Rolle ist die Laufzeitidentität für den Dispatch; eine eingecheckte Definition gibt einem Subagenten eine vendor-native Persona. Diese Ebenen überschneiden sich bewusst. Entscheidend sind Aufgabenbereich und Akzeptanzkriterien, wenn Sie beurteilen, ob ein einzelner Skill genügt.

Die Agenten-Definitionen unter `.agents/agents/` sind die Quelle der Wahrheit. OMA projiziert sie für Laufzeiten mit Unterstützung für benutzerdefinierte Subagenten in vendor-native Dateien:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` oder eine andere unterstützte Projektion des ausgewählten Vendors

Ordnet ein Workflow einen Agenten demselben Vendor wie die aktuelle Laufzeit zu, verwendet er zuerst die native Agentendatei dieser Laufzeit. Vendorübergreifende Aufgaben fallen auf `oma agent spawn` zurück.

> **Dispatch des Agentenmodells:** Jeder Agent wird über `model_preset` (und optionale `agents:`-Überschreibungen) in `.agents/oma-config.yaml` einer Modellkennung, einem CLI-Vendor und einem Reasoning-Aufwand zugeordnet. Siehe [Agentenmodelle](../guide/per-agent-models.md) für die Konfiguration und [`oma doctor --profile`](../cli-interfaces/commands.md#doctor), um die aktive Matrix zu prüfen.

---

## Agenten-Kategorien

| Kategorie | Agenten | Zuständigkeit |
|----------|--------|---------------|
| **Ideenfindung** | oma-brainstorm | Ideen erkunden, Ansätze vorschlagen, Designdokumente erstellen |
| **Architektur** | oma-architecture | System-/Modul-/Service-Grenzen, Analyse im Stil von ADR/ATAM/CBAM, Trade-off-Aufzeichnungen |
| **Planung** | oma-pm | Anforderungszerlegung, Aufgabenaufschlüsselung, API-Verträge, Prioritätszuweisung |
| **Implementierung** | oma-frontend, oma-backend, oma-mobile, oma-db | Produktionscode in ihren jeweiligen Domänen schreiben |
| **Design** | oma-design | Design-Systeme, DESIGN.md, Tokens, Typografie, Farbe, Bewegung, Barrierefreiheit |
| **Infrastruktur** | oma-tf-infra | Multi-Cloud-Terraform-Bereitstellung, IAM, Kostenoptimierung, Policy-as-Code |
| **DevOps** | oma-dev-workflow | mise Task Runner, CI/CD, Migrationen, Release-Koordination, Monorepo-Automatisierung |
| **Observability** | oma-observability | Observability-Pipelines, Traceability-Routing, MELT+P-Signale (metrics/logs/traces/profiles/cost/audit/privacy), SLO-Management, Incident-Forensik, Transport-Tuning |
| **Qualität** | oma-qa | Sicherheitsaudit (OWASP), Performance, Barrierefreiheit (WCAG), Code-Qualitäts-Review |
| **Debugging** | oma-debug | Bug-Reproduktion, Grundursachenanalyse, minimale Korrekturen, Regressionstests |
| **Lokalisierung** | oma-translation | Kontextbewusste Übersetzung unter Bewahrung von Ton, Register und Fachbegriffen |
| **Koordination** | oma-orchestration, oma-coordination | Automatisierte und manuelle Multi-Agenten-Orchestrierung |
| **Git** | oma-scm | Conventional-Commits-Generierung, Feature-basierte Commit-Aufteilung |
| **Suche & Retrieval** | oma-search | Intent-basierter Such-Router mit Trust-Scoring (Context7-Dokumente, Web, `gh`/`glab`-Code, lokale Code-Intelligenz) |
| **Retrospektive** | oma-recap | Werkzeug-übergreifende Konversationshistorie-Analyse und themenbezogene Arbeitszusammenfassungen |
| **Dokumentenverarbeitung** | oma-hwp, oma-pdf | HWP/HWPX/HWPML- und PDF-zu-Markdown-Konvertierung für LLM/RAG-Ingest |
| **Dokumentation** | oma-docs | Dokumentationsdrift erkennen (fehlerhafte Verweise prüfen, Synchronisierungspatches für diff-betroffene Dokumente vorschlagen) |
| **Erklärung** | oma-explanation | Offline-interaktive HTML-Erklärungen für Diffs, Branches, PRs oder Commit-Bereiche |
| **Wissenschaftliches Schreiben** | oma-academic-writing, oma-scholar | Publikationsreife akademische Prosa sowie wissenschaftliche Recherche, Suche und Peer-Review mit Knows-Sidecars |
| **Sicherheit** | oma-deepsec | Vercels agentengestützten deepsec-Schwachstellenscanner kostenbewusst steuern (Scan, PR-Gate, Matcher, Triage) |
| **Refactoring** | oma-refactor | Verhaltenserhaltende, inkrementelle Umstrukturierung mit Hotspot-Fokus und Sicherheitsnetzen aus Charakterisierungstests |
| **Marktforschung** | oma-market | Schmerzpunkte, Trends und Wettbewerber aus Community-Signalen mit SWOT-/Porter-5F-/PESTEL-Rahmen untersuchen |
| **Skill-Autorenschaft** | oma-skill-creation | OMA-Skills im SSL-lite-Format erstellen und validieren |
| **Medienerzeugung** | oma-image, oma-slide, oma-video, oma-voice | KI-Bilder, HTML-Präsentationen, Kurz-/Erklär-/Demo-Videos sowie lokale TTS-/STT-Verarbeitung |

---

## Detaillierte Agenten-Referenz

### oma-brainstorm

**Domäne:** Design-first-Ideenfindung vor Planung oder Implementierung.

**Einsatzbereich:** Neue Feature-Ideen erkunden, Benutzerabsichten verstehen, Ansätze vergleichen. Vor `/plan` für komplexe oder mehrdeutige Anfragen verwenden.

**Nicht verwenden bei:** Klaren Anforderungen (an oma-pm weitergeben), Implementierung (an Domänenagenten weitergeben), Code-Review (an oma-qa weitergeben).

**Kernregeln:**
- Keine Implementierung oder Planung vor der Design-Genehmigung
- Eine klärende Frage auf einmal (keine Bündel)
- Immer 2-3 Ansätze mit einer empfohlenen Option vorschlagen
- Abschnittweises Design mit Benutzerbestätigung bei jedem Schritt
- YAGNI — nur entwerfen, was benötigt wird

**Workflow:** 6 Phasen: Kontexterkundung, Fragen, Ansätze, Design, Dokumentation (speichert nach `docs/plans/`), Überleitung zu `/plan`.

**Ressourcen:** Verwendet nur gemeinsame Ressourcen (clarification-protocol, quality-principles, skill-routing).

---

### oma-architecture

**Domäne:** Software-/Systemarchitektur — Modul- und Service-Grenzen, Trade-off-Analyse, Stakeholder-Synthese, Entscheidungsprotokolle.

**Einsatzbereich:** Auswahl oder Überprüfung der Systemarchitektur, Definition von Modul-/Service-/Ownership-Grenzen, Vergleich von Architekturoptionen mit expliziten Trade-offs, Untersuchung architektonischer Probleme (Change Amplification, versteckte Abhängigkeiten, umständliche APIs), Priorisierung von Architekturinvestitionen oder Refactorings, Verfassen von Architekturempfehlungen oder ADRs.

**Nicht verwenden bei:** Visuellen/Design-Systemen (oma-design verwenden), Feature-Planung und Aufgabenzerlegung (oma-pm verwenden), Terraform-Implementierung (oma-tf-infra verwenden), Bug-Diagnose (oma-debug verwenden), Sicherheits-/Performance-/Barrierefreiheits-Review (oma-qa verwenden).

**Methoden:** Diagnostisches Routing, Design-Twice-Vergleich, Risikoanalyse im ATAM-Stil, Priorisierung im CBAM-Stil, Entscheidungsprotokolle im ADR-Stil.

**Kernregeln:**
- Das Architekturproblem vor der Methodenwahl diagnostizieren
- Die leichteste hinreichende Methode für die aktuelle Entscheidung verwenden
- Architekturentwurf von UI-/Visualdesign und Terraform-Umsetzung unterscheiden
- Stakeholder-Agenten nur konsultieren, wenn die Entscheidung übergreifend genug ist, um die Kosten zu rechtfertigen
- Qualität der Empfehlung ist wichtiger als Konsens-Theater: breit beraten, explizit entscheiden
- Jede Empfehlung nennt Annahmen, Trade-offs, Risiken und Validierungsschritte
- Standardmäßig kostenbewusst: Implementierungskosten, Betriebskosten, Teamkomplexität, zukünftige Änderungskosten

**Ressourcen:** `SKILL.md`, `resources/`-Verzeichnis mit Methodenhandbüchern (diagnostic-routing, design-twice, ATAM, CBAM, ADR-Vorlagen).

---

### oma-pm

**Domäne:** Produktmanagement — Anforderungsanalyse, Aufgabenzerlegung, API-Verträge.

**Einsatzbereich:** Komplexe Features aufschlüsseln, Machbarkeit bestimmen, Arbeit priorisieren, API-Verträge definieren.

**Kernregeln:**
- API-first-Design: Verträge vor Implementierungsaufgaben definieren
- Jede Aufgabe enthält: Agent, Titel, Akzeptanzkriterien, Priorität, Abhängigkeiten
- Abhängigkeiten minimieren für maximale parallele Ausführung
- Sicherheit und Tests sind Bestandteil jeder Aufgabe (keine separaten Phasen)
- Aufgaben müssen von einem einzelnen Agenten abschließbar sein
- Ausgabe: JSON-Plan + task-board.md für Orchestrator-Kompatibilität

**Ausgabe:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, Memory-Eintrag für Orchestrator.

**Ressourcen:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/template.md` (Verträge werden nach `.agents/results/api-contracts/` geschrieben).

---

### oma-frontend

**Domäne:** Web-UI — React, Next.js, TypeScript mit FSD-lite-Architektur.

**Einsatzbereich:** Benutzeroberflächen, Komponenten, clientseitige Logik, Styling, Formularvalidierung, API-Integration.

**Tech-Stack:**
- React + Next.js (Server-Components Standard, Client-Components für Interaktivität)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (schreibgeschützte Primitiven, Erweiterung via cva/Wrapper)
- FSD-lite: Root `src/` + Feature `src/features/*/` (keine Feature-übergreifenden Imports)

**Bibliotheken:**
| Zweck | Bibliothek |
|---------|---------|
| Datum | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks oder @mantine/hooks |
| Hilfsfunktionen | es-toolkit |
| URL-Status | nuqs |
| Server-Status | TanStack Query (oder von orval generierte Hooks bei vorhandener OpenAPI-Spezifikation) |
| Client-Status | Jotai (Verwendung minimieren) |
| Formulare | @tanstack/react-form + Zod |
| Authentifizierung | better-auth |

**Kernregeln:**
- shadcn/ui zuerst, Erweiterung via cva, niemals `components/ui/*` direkt modifizieren
- Design-Tokens 1:1-Zuordnung (niemals Farben hardcoden)
- Proxy statt Middleware (Next.js 16+ verwendet `proxy.ts`, nicht `middleware.ts` für Proxy-Logik)
- Kein Prop-Drilling über 3 Ebenen hinaus — Jotai-Atoms verwenden
- Absolute Imports mit `@/` sind Pflicht
- FCP-Ziel < 1 s
- Responsive Breakpoints: 320px, 768px, 1024px, 1440px

**Ressourcen:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` und `checklist.md`.

**Qualitäts-Gate-Checkliste:**
- Barrierefreiheit: ARIA-Labels, semantische Überschriften, Tastaturnavigation
- Mobil: auf mobilen Viewports verifiziert
- Performance: kein CLS, schnelle Ladezeit
- Resilienz: Error Boundaries und Lade-Skelette
- Tests: Logik durch Vitest abgedeckt
- Qualität: Typecheck und Lint bestehen

---

### oma-backend

**Domäne:** APIs, serverseitige Logik, Authentifizierung, Datenbankoperationen.

**Einsatzbereich:** REST-/GraphQL-APIs, Datenbankmigrationen, Authentifizierung, serverseitige Geschäftslogik, Hintergrundjobs.

**Architektur:** Router (HTTP) -> Service (Geschäftslogik) -> Repository (Datenzugriff) -> Modelle.

**Stack-Erkennung:** Liest Projektmanifeste (pyproject.toml, package.json, Cargo.toml, go.mod usw.), um Sprache und Framework zu bestimmen. Wenn projektspezifische Konventionen fehlen, fordert sie den Benutzer auf, `/stack-set` auszuführen; dieser Befehl materialisiert die aufgelösten `stack/`-Referenzen aus dem ausgelieferten Schema und den Vorlagen.

**Kernregeln:**
- Clean Architecture: keine Geschäftslogik in Route-Handlern
- Alle Eingaben mit der Validierungsbibliothek des Projekts validiert
- Nur parametrisierte Abfragen (niemals String-Interpolation in SQL)
- JWT + Argon2id für Authentifizierung (bcrypt ist für Legacy-Kompatibilität zulässig); Rate-Limiting für Auth-Endpunkte
- Async wo unterstützt; Typannotationen auf allen Signaturen
- Benutzerdefinierte Exceptions über zentrales Fehlermodul
- Explizite ORM-Ladestrategie, Transaktionsgrenzen, sicherer Lebenszyklus

**Ressourcen:** `execution-protocol.md`, `orm-reference.md`, `checklist.md` und `error-playbook.md`. `variants/stack.schema.json` definiert die Form des Stack-Manifests.

<!-- oma-docs:ignore-start -->
Projektspezifische `stack/stack.yaml`, `stack/tech-stack.md`, Snippets und API-Vorlagen werden bei Bedarf durch `/stack-set` erzeugt; sie fehlen, bis der Stack materialisiert wurde.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Domäne:** Plattformübergreifende und native mobile Apps (Flutter, React Native und native Swift-iOS-Apps).

**Einsatzbereich:** Native mobile Apps (iOS + Android), mobilspezifische UI-Muster, Plattformfunktionen (Kamera, GPS, Push-Benachrichtigungen), Offline-first-Architektur sowie native Swift-iOS-Apps mit SwiftUI und `swift-openapi-generator`.

**Architektur:** Clean Architecture: Domäne -> Daten -> Präsentation. Für Swift-iOS: Projektstruktur `App/Core/Features/Shared`.

**Tech-Stacks:**
- Flutter/Dart: Riverpod/Bloc (Zustandsverwaltung), Dio mit Interceptors (API), GoRouter (Navigation), Material Design 3 (Android) + iOS HIG.
- Native Swift-iOS-Apps (iOS 17+): SwiftUI + `@Observable` (Observation-Framework), Apples `swift-openapi-generator` für API-Clients, Layout `App/Core/Features/Shared`.

**Kernregeln:**
- Riverpod/Bloc für Zustandsverwaltung (kein rohes setState für komplexe Logik)
- Alle Controller in der `dispose()`-Methode freigeben
- Dio mit Interceptors für API-Aufrufe; Offline-Zustand elegant behandeln
- 60 fps-Ziel; auf beiden Plattformen testen
- Swift: Unter iOS 17+ `@Observable` statt `ObservableObject` verwenden; API-Clients aus OpenAPI-Spezifikationen mit `swift-openapi-generator` generieren

**Ressourcen:** `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` und `error-playbook.md`. Das Verzeichnis `variants/` enthält das Stack-Schema und generierte Plattformreferenzen, sobald `/stack-set` sie materialisiert.

---

### oma-db

**Domäne:** Datenbankarchitektur — SQL, NoSQL, Vektordatenbanken.

**Einsatzbereich:** Schema-Design, ERD, Normalisierung, Indizierung, Transaktionen, Kapazitätsplanung, Backup-Strategie, Migrationsdesign, Vektordatenbank-/RAG-Architektur, Anti-Pattern-Review, Compliance-bewusstes Design (ISO 27001/27002/22301).

**Standard-Workflow:** Erkunden (Entitäten, Zugriffsmuster, Volumen identifizieren) -> Entwerfen (Schema, Constraints, Transaktionen) -> Optimieren (Indizes, Partitionierung, Archivierung, Anti-Patterns).

**Kernregeln:**
- Zuerst das Modell wählen, dann die Engine
- 3NF-Standard für relational; BASE-Tradeoffs für verteilt dokumentieren
- Alle drei Schema-Schichten dokumentieren: extern, konzeptionell, intern
- Integrität als erstklassiges Prinzip: Entitäts-, Domänen-, referentielle und Geschäftsregel-Integrität
- Nebenläufigkeit ist niemals implizit: Transaktionsgrenzen und Isolationsebenen definieren
- Vektordatenbanken sind Abruf-Infrastruktur, nicht Quellsystem
- Vektorsuche niemals als direkten Ersatz für lexikalische Suche behandeln

**Erforderliche Ergebnisse:** Zusammenfassung des externen Schemas, konzeptionelles Schema, internes Schema, Datenstandards-Tabelle, Glossar, Kapazitätsschätzung, Backup-/Recovery-Strategie. Für Vektor/RAG: Embedding-Versionierungsrichtlinie, Chunking-Richtlinie, hybride Abrufstrategie.

**Ressourcen:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domäne:** Design-Systeme, UI/UX, DESIGN.md-Verwaltung.

**Einsatzbereich:** Design-Systeme erstellen, Landingpages, Design-Tokens, Farbpaletten, Typografie, responsive Layouts, Barrierefreiheits-Review.

**Workflow:** 7 Phasen: Setup (Kontexterfassung) -> Extraktion (optional, aus Referenz-URLs) -> Anreicherung (vage Prompt-Erweiterung) -> Vorschlag (2-3 Designrichtungen) -> Generierung (DESIGN.md + Tokens) -> Audit (Responsive, WCAG, Nielsen, KI-Kitsch-Prüfung) -> Übergabe.

**Anti-Pattern-Durchsetzung ("kein KI-Kitsch"):**
- Typografie: System-Font-Stack als Standard; keine Standard-Google-Fonts ohne Begründung
- Farbe: keine Lila-zu-Blau-Verläufe, keine Verlaufskugeln/-kleckse, kein reines Weiß auf reinem Schwarz
- Layout: keine verschachtelten Karten, keine rein Desktop-optimierten Layouts, keine schablonenhaften 3-Metrik-Statistik-Layouts
- Bewegung: nicht überall Bounce-Easing, keine Animationen > 800 ms, prefers-reduced-motion muss respektiert werden
- Komponenten: nicht überall Glassmorphismus, alle interaktiven Elemente benötigen Tastatur-/Touch-Alternativen

**Kernregeln:**
- Zuerst `.design-context.md` prüfen; erstellen, falls nicht vorhanden
- System-Font-Stack als Standard (CJK-fähige Schriftarten für ko/ja/zh)
- WCAG AA-Minimum für alle Designs
- Responsive-first (Mobil als Standard)
- 2-3 Richtungen präsentieren, Bestätigung einholen

**Ressourcen:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus `reference/`-Verzeichnis (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

---

### oma-tf-infra

**Domäne:** Infrastructure-as-Code mit Terraform, Multi-Cloud.

**Einsatzbereich:** Bereitstellung auf AWS/GCP/Azure/Oracle Cloud, Terraform-Konfiguration, CI/CD-Authentifizierung (OIDC), CDN/Load-Balancer/Storage/Netzwerk, Zustandsverwaltung, ISO-Compliance-Infrastruktur.

**Cloud-Erkennung:** Liest Terraform-Provider und Ressourcenpräfixe (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Enthält eine vollständige Multi-Cloud-Ressourcenzuordnungstabelle.

**Kernregeln:**
- Provider-agnostisch: Cloud aus Projektkontext erkennen
- Remote-State mit Versionierung und Locking
- OIDC-first für CI/CD-Authentifizierung
- Immer Plan vor Apply
- Minimale IAM-Berechtigungen
- Alles taggen (Environment, Project, Owner, CostCenter)
- Keine Secrets im Code
- Alle Provider und Module versionspinnen
- Kein Auto-Approve in der Produktion

**Ressourcen:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domäne:** Monorepo-Aufgabenautomatisierung und CI/CD.

**Einsatzbereich:** Dev-Server starten, Lint/Format/Typecheck über Apps hinweg ausführen, Datenbankmigrationen, API-Generierung, i18n-Builds, Produktions-Builds, CI/CD-Optimierung, Pre-Commit-Validierung.

**Kernregeln:**
- Immer `mise run`-Tasks anstelle direkter Paketmanager-Befehle verwenden
- Lint/Test nur auf geänderten Apps ausführen
- Commit-Nachrichten mit commitlint validieren
- CI sollte unveränderte Apps überspringen
- Niemals direkte Paketmanager-Befehle verwenden, wenn mise-Tasks existieren

**Ressourcen:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domäne:** Intent-basierter Observability- und Traceability-Router über Schichten, Grenzen und Signale hinweg.

**Einsatzbereich:** Aufbau von Observability-Pipelines (OTel SDK + Collector + Vendor-Backend), Traceability über Service- und Domänengrenzen hinweg (W3C-Propagatoren, Baggage, Multi-Tenant, Multi-Cloud), Transport-Tuning (UDP/MTU-Schwellenwerte, OTLP gRPC vs. HTTP, Collector DaemonSet vs. Sidecar-Topologie, Sampling-Rezepte), Incident-Forensik (6-dimensionale Lokalisierung: code / service / layer / host / region / infra), Auswahl der Vendor-Kategorie (OSS Full-Stack vs. kommerzielles SaaS vs. High-Cardinality-Spezialist vs. Profiling-Spezialist), Observability-as-Code (Grafana-Jsonnet-Dashboards, PrometheusRule CRD, OpenSLO YAML, SLO-Burn-Rate-Alerts), Meta-Observability (Pipeline-Selbst-Health, Clock-Skew, Cardinality-Guardrails, Retention-Matrix), MELT+P-Signalabdeckung (metrics, logs, traces, profiles, cost, audit, privacy), Migration von veralteten Tools (Fluentd -> Fluent Bit oder OTel Collector).

**Nicht verwenden bei:** LLM-Ops / gen_ai-Observability (Langfuse, Arize Phoenix, LangSmith, Braintrust verwenden), Data-Pipeline-Lineage (OpenLineage + Marquez, dbt test, Airflow Lineage), IoT / Rechenzentrums-Physical-Layer-Telemetrie (Nlyte, Sunbird, Device42), Chaos-Engineering-Orchestrierung (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU-/TPU-Infrastruktur (NVIDIA DCGM Exporter), Software-Supply-Chain (sigstore, in-toto, SLSA), Incident-Response-Workflow / Paging (PagerDuty, OpsGenie, Grafana OnCall), Single-Vendor-Setup, das bereits vom vendor-eigenen Skill abgedeckt ist.

**Kernregeln:**
- Intent vor dem Routing klassifizieren: setup | migrate | investigate | alert | trace | tune | route
- Kategorie-first statt Vendor-Registry: an vendor-eigene Skills über `resources/vendor-categories.md` delegieren; Vendor-Dokumentation nicht duplizieren
- Transport-Tuning ist der Burggraben: UDP/MTU-Schwellenwerte, OTLP-Protokollwahl, Collector-Topologie und Sampling-Rezepte sind Tiefen, die andere Skills nicht abdecken
- Meta-Observability ist nicht verhandelbar: Pipeline-Selbst-Health, Clock-Sync (< 100 ms Drift), Cardinality und Retention validieren, bevor das Setup als abgeschlossen erklärt wird
- CNCF-first-Präferenz: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd ist veraltet (CNCF 2025-10): für neue und Migrationsarbeiten Fluent Bit oder OTel Collector empfehlen
- W3C Trace Context als Standard-Propagator; pro Cloud übersetzen (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Privacy vor Features: PII-Redaction, sampling-bewusste Baggage-Regeln, SOC2/ISO unveränderliches Audit + GDPR/PIPA-Löschung werden bei der Erfassung angewendet, nicht erst im Storage

**Ressourcen:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, sowie tiefe Ressourcen unter `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) und `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domäne:** Qualitätssicherung — Sicherheit, Performance, Barrierefreiheit, Code-Qualität.

**Einsatzbereich:** Abschließendes Review vor dem Deployment, Sicherheitsaudits, Performance-Analyse, Barrierefreiheits-Compliance, Testabdeckungsanalyse.

**Review-Prioritätsreihenfolge:** Sicherheit > Performance > Barrierefreiheit > Code-Qualität.

**Schweregrade:**
- **CRITICAL**: Sicherheitslücke, Risiko von Datenverlust
- **HIGH**: Blockiert den Start
- **MEDIUM**: In diesem Sprint beheben
- **LOW**: Backlog

**Kernregeln:**
- Jeder Befund muss Datei:Zeile, Beschreibung und Korrektur enthalten
- Zuerst automatisierte Tools ausführen (npm audit, bandit, lighthouse)
- Keine Fehlalarme — jeder Befund muss reproduzierbar sein
- Behebungscode bereitstellen, nicht nur Beschreibungen

**Ressourcen:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

---

### oma-debug

**Domäne:** Bug-Diagnose und -Behebung.

**Einsatzbereich:** Vom Benutzer gemeldete Bugs, Abstürze, Performance-Probleme, intermittierende Fehler, Race Conditions, Regressions-Bugs.

**Methodik:** Zuerst reproduzieren, dann diagnostizieren. Niemals Korrekturen erraten.

**Kernregeln:**
- Grundursache identifizieren, nicht nur Symptome
- Minimale Korrektur: nur das Notwendige ändern
- Jede Korrektur erhält einen Regressionstest
- Nach ähnlichen Mustern an anderen Stellen suchen
- In `.agents/results/` dokumentieren

**Verwendete Code-Intelligenz-Tools (Gortex oder Serena):**
- `find_symbol("functionName")` oder Gortex-Symbolnavigation — Funktion lokalisieren
- `find_referencing_symbols("Component")` oder Gortex-Impact-Analyse — alle Verwendungen finden
- `search_for_pattern("error pattern")` oder Gortex-Suche — ähnliche Probleme finden

**Ressourcen:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

---

### oma-translation

**Domäne:** Kontextbewusste mehrsprachige Übersetzung.

**Einsatzbereich:** UI-Strings, Dokumentation, Marketingtexte übersetzen, vorhandene Übersetzungen prüfen, Glossare erstellen.

**Sechs-Phasen-Ablauf:** Vorbereiten, Erfassen, Überlegen, Ausführen, Verifizieren und Abschließen. Die Übersetzungsmethode umfasst vier Schritte: Bedeutung und geschützte Syntax lesen, Register wählen, im Zieltext rekonstruieren und den passenden Autorenstil bewahren.

**Kernregeln:**
- Vorhandene Locale-Dateien zuerst scannen, um Konventionen zu übernehmen
- Bedeutung übersetzen, nicht Wörter
- Emotionale Konnotationen bewahren
- Niemals wörtliche Übersetzungen produzieren
- Niemals Register innerhalb eines Textes mischen
- Domänenspezifische Terminologie unverändert beibehalten

**Ressourcen:** `translation-rubric.md`, `anti-ai-patterns.md` (beide sprachneutral) sowie ein zielsprachenspezifisches Profil unter `resources/lang/` (`ko`, `ja`, `zh`, `en`; mit `_template.md` lassen sich weitere Profile anlegen).

---

### oma-orchestration

**Domäne:** Automatisierte Multi-Agenten-Koordination via CLI-Spawning.

**Einsatzbereich:** Komplexe Features, die mehrere parallele Agenten erfordern, automatisierte Ausführung, Full-Stack-Implementierung.

**Konfigurationsstandards:**

| Einstellung | Standard | Beschreibung |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Maximale gleichzeitige Subagenten |
| MAX_RETRIES | 2 | Wiederholungsversuche pro fehlgeschlagener Aufgabe |
| POLL_INTERVAL | 30 s | Intervall für Statusprüfungen |

**Workflow-Phasen:** Plan -> Setup (Sitzungs-ID, Memory-Initialisierung) -> Ausführung (Spawn nach Prioritätsstufe) -> Überwachung (Fortschritt abfragen) -> Verifikation (automatisierte + Gegen-Review-Schleife) -> Sammlung (Ergebnisse zusammentragen).

**Agenten-zu-Agenten-Review-Schleife:**
1. Selbst-Review: Agent prüft eigenen Diff gegen Akzeptanzkriterien
2. Automatische Verifikation: `oma verify agent {agent-type} --workspace {workspace}`
3. Gegen-Review: QA-Agent prüft Änderungen
4. Bei Fehlschlag: Probleme werden zur Behebung zurückgemeldet (maximal 5 Schleifendurchläufe)

**Sitzungsbelege:** Hält bei Bedarf wesentliche Korrekturen und beurteilte Review-Befunde mit Ursache, Auswirkung und Verifikation fest. Es gibt weder eine Strafpunktzahl noch eine durch einen Punktestand ausgelöste Pause.

**Ressourcen:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domäne:** Git-Commit-Generierung nach Conventional Commits.

**Einsatzbereich:** Nach Abschluss von Codeänderungen, bei Ausführung von `/scm`.

**Commit-Typen:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow:** Änderungen analysieren -> Nach Feature aufteilen (wenn > 5 Dateien über verschiedene Scopes/Typen) -> Typ bestimmen -> Scope bestimmen -> Beschreibung schreiben (Imperativ, < 72 Zeichen, Kleinschreibung, kein abschließender Punkt) -> Commit sofort ausführen.

**Regeln:**
- Niemals `git add -A` oder `git add .` verwenden
- Niemals Secrets-Dateien committen
- Beim Staging immer Dateien explizit angeben
- HEREDOC für mehrzeilige Commit-Nachrichten verwenden
- Co-Author-Trailer werden nur eingefügt, wenn die wirksame Konfiguration `scm.co_author` aktiviert und Name und E-Mail-Adresse bereitstellt.

---

### oma-coordination

**Domäne:** Leitfaden für manuelle, schrittweise Multi-Agenten-Koordination.

**Einsatzbereich:** Komplexe Projekte, bei denen Sie an jedem Gate Human-in-the-Loop-Kontrolle wünschen, manuelle Anleitung zum Spawnen von Agenten, schrittweise Koordinationsrezepte.

**Nicht einsetzen:** Vollautomatische parallele Ausführung (oma-orchestration verwenden), Aufgaben in einer einzelnen Domäne (den Domänenagenten direkt verwenden).

**Kernregeln:**
- Den Plan vor dem Spawnen von Agenten stets zur Bestätigung durch den Benutzer vorlegen
- Eine Prioritätsstufe nach der anderen -- vor der nächsten Stufe den Abschluss abwarten
- Der Benutzer genehmigt jeden Gate-Übergang
- QA-Review ist vor dem Merge verpflichtend
- Remediation-Loop für CRITICAL/HIGH-Befunde

**Workflow:** PM plant → Benutzer bestätigt → Spawn nach Prioritätsstufe → Überwachen → QA-Review → Probleme beheben → Ausliefern.

**Unterschied zu oma-orchestration:** Coordination ist manuell und geführt (der Benutzer steuert das Tempo), Orchestrator ist automatisiert (Agenten werden mit minimaler Benutzerintervention gespawnt und ausgeführt).

---

### oma-search

**Domäne:** Intent-basierter Such-Router mit Domain-Trust-Scoring — leitet Anfragen an Context7 (Dokumente), native Websuche, `gh`/`glab` (Code) und lokale Code-Intelligenz (Gortex oder Serena) weiter.

**Einsatzbereich:** Auffinden offizieller Bibliotheks-/Framework-Dokumentation, Webrecherche zu Tutorials/Beispielen/Vergleichen/Lösungen, GitHub/GitLab-Codesuche nach Implementierungsmustern, Anfragen mit unklarem Suchkanal (Auto-Routing), andere Skills, die Suchinfrastruktur benötigen (geteilte Invokation).

**Nicht verwenden bei:** Ausschließlich lokaler Codebase-Erkundung (Serena MCP direkt verwenden), Git-Historien- oder Blame-Analyse (oma-scm verwenden), vollständiger Architekturrecherche (oma-architecture verwenden, das diesen Skill intern aufrufen kann).

**Kernregeln:**
- Intent vor der Suche klassifizieren — jede Anfrage durchläuft zuerst den IntentClassifier
- Eine Anfrage, eine beste Route — redundantes Multi-Routing vermeiden, sofern der Intent nicht mehrdeutig ist
- Trust-Score für jedes Ergebnis — alle Nicht-lokalen Ergebnisse erhalten Domain-Trust-Labels aus der Registry
- Flags überschreiben den Klassifizierer: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: bei Ausfall der primären Route graziös zurückfallen (docs→web, web→`oma search fetch`-Strategien)
- Kein zusätzliches MCP erforderlich: Context7 für Dokumente, runtime-nativ für Web, CLI für Code, konfigurierter Provider (Gortex oder Serena) für lokal
- Vendor-neutrale Websuche: was auch immer die aktuelle Runtime bietet (WebSearch, Google, Bing)
- Nur Domain-Level-Trust — keine Sub-Path- oder Seiten-Scores

**Ressourcen:** `SKILL.md`, `resources/`-Verzeichnis mit Intent-Klassifizierer, Routendefinitionen und Trust-Registry.

---

### oma-recap

**Domäne:** Analyse von Konversationshistorien über mehrere KI-Tools hinweg (Claude, Codex, Qwen, Cursor) mit themenbezogenen täglichen/periodischen Arbeitszusammenfassungen.

**Einsatzbereich:** Zusammenfassung eines Tages oder Zeitraums von Arbeitsaktivität, Verständnis des Arbeitsflusses über mehrere KI-Tools hinweg, Analyse von Tool-Wechselmustern zwischen Sitzungen, Vorbereitung täglicher Standups/wöchentlicher Retros/Arbeitsprotokolle.

**Nicht verwenden bei:** Git-Commit-basierter Code-Änderungsretrospektive (`oma retro` verwenden), Echtzeit-Agenten-Überwachung (`oma dashboard terminal` verwenden), Produktivitätsmetriken (`oma stats get` verwenden).

**Prozess:**
1. Datum oder Zeitfenster aus natürlichsprachiger Eingabe auflösen (today, yesterday, last Monday, explizites Datum)
2. Konversationsdaten via `oma recap --date YYYY-MM-DD` oder `--since` / `--until` abrufen
3. Nach Tool und Sitzung gruppieren
4. Themen extrahieren (bearbeitete Features, behobene Bugs, erkundete Tools)
5. Themenbezogene Tages-/Zeitraumzusammenfassung rendern

**Ressourcen:** `SKILL.md` — delegiert die eigentliche Arbeit an die `oma recap` CLI.

---

### oma-hwp

**Domäne:** HWP / HWPX / HWPML (koreanische Textverarbeitung) → Markdown-Konvertierung mittels `kordoc`.

**Einsatzbereich:** Konvertierung koreanischer HWP-Dokumente (`.hwp`, `.hwpx`, `.hwpml`) in Markdown, Aufbereitung koreanischer Regierungs-/Unternehmensdokumente für LLM-Kontext oder RAG, Extraktion strukturierter Inhalte (Tabellen, Überschriften, Listen, Bilder, Fußnoten, Hyperlinks) aus HWP.

**Nicht verwenden bei:** PDF-Dateien (oma-pdf verwenden), XLSX/DOCX (außerhalb des Umfangs), Erstellen/Bearbeiten von HWP (außerhalb des Umfangs), bereits vorhandenen Textdateien (Read-Tool direkt verwenden).

**Kernregeln:**
- Ausführung mit `bunx kordoc@latest` — keine Installation erforderlich; immer `@latest` oder eine fixierte Version übergeben
- Standardausgabeformat ist Markdown
- Ohne angegebenes Ausgabeverzeichnis wird in das Eingangsverzeichnis geschrieben
- kordoc kümmert sich um die Strukturerhaltung (Überschriften, Tabellen, verschachtelte Tabellen, Fußnoten, Hyperlinks, Bilder)
- Sicherheitsabwehr (ZIP-Bombe, XXE, SSRF, XSS) wird von kordoc bereitgestellt — keine eigenen ergänzen
- Bei verschlüsseltem oder DRM-gesperrtem HWP die Einschränkung dem Benutzer klar melden
- Nachbearbeitung mit `resources/flatten-tables.ts`, um HTML-`<table>`-Blöcke in GFM-Pipe-Tabellen zu konvertieren und Hancom-Private-Use-Area-Zeichen zu entfernen

**Ressourcen:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domäne:** PDF-zu-Markdown-Konvertierung mittels `opendataloader-pdf`.

**Einsatzbereich:** Konvertierung von PDF-Dokumenten in Markdown für LLM-Kontext oder RAG, Extraktion strukturierter Inhalte (Tabellen, Überschriften, Listen) aus PDFs, Aufbereitung von PDF-Daten für KI-Verwendung.

**Nicht verwenden bei:** Erzeugen/Erstellen von PDFs (geeignete Dokumenten-Tools verwenden), Bearbeiten bestehender PDFs (außerhalb des Umfangs), einfaches Lesen bereits vorhandener Textdateien (Read-Tool direkt verwenden).

**Kernregeln:**
- Ausführung mit `uvx opendataloader-pdf` — keine Installation erforderlich
- Standardausgabeformat ist Markdown
- Ohne angegebenes Ausgabeverzeichnis wird in das Eingangsverzeichnis der PDF geschrieben
- Dokumentstruktur erhalten (Überschriften, Tabellen, Listen, Bilder)
- Für gescannte PDFs Hybridmodus mit OCR verwenden
- Immer `uvx mdformat` auf die Ausgabe anwenden, um die Markdown-Formatierung zu normalisieren
- Prüfen, dass die Ausgabe lesbar und gut strukturiert ist
- Konvertierungsprobleme (fehlende Tabellen, verstümmelter Text) dem Benutzer melden

**Ressourcen:** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writing

**Domäne:** Publikationsreife akademische englische Prosa: Essays, Berichte, Analyseabschnitte, Executive Summaries, Schlussfolgerungen und Literaturüberblicke entwerfen, überarbeiten und prüfen.

**Einsatzbereich:** Akademische Berichte, Essays und Analyseabschnitte entwerfen oder überarbeiten, Executive Summaries, Schlussfolgerungen oder Literaturüberblicke schreiben, KI-typische Prosa in natürliche akademische englische Prosa umformulieren, Entwürfe auf Spitzenqualität nach einer Bewertungsrubrik (HD, A, Top-Band) prüfen sowie Satzvariation, Verbqualität, Hedging und Anti-KI-Konformität prüfen.

**Nicht verwenden bei:** Übersetzungen (oma-translation verwenden), Quellenfindung, Zitataufbereitung oder Literaturrecherche (oma-scholar verwenden), Rubrikanalyse und Aufgabenzerlegung (oma-pm verwenden), Code-Dokumentation, README- oder API-Referenztexten (passenden Domänen-Skill verwenden), informeller oder Marketingprosa sowie nichtenglischem akademischem Schreiben (zuerst auf Englisch verfassen, dann an oma-translation übergeben).

**Modi:** `draft` (Überschrift + Prosa + Writing Notes + Claim-Evidence Map), `revise` (Original + Überarbeitung + Änderungsliste), `review` (PASS/FAIL-Bericht über Satzstruktur, Verbqualität, Anti-KI, Spezifität, Hedging, Absatzklarheit, Rhythmus und Claim-Evidence-Zuordnung).

**Kernregeln:**
- Vor dem Urteil zitieren: den wörtlichen Rubrik- oder Einschränkungstext nennen, bevor eine Regel angewendet wird
- Jeder Satz muss überprüfbar sein; Daten, Statistiken oder Zitate niemals erfinden
- Verbotene allgemeine Verben (`show`, `have`, `make`, `do`, `get`, `use`, …) dürfen keine Hauptverben sein
- Satzart, Länge und Einstiege variieren; niemals drei oder mehr Sätze desselben Typs hintereinander
- Hedging-Stärke an die Evidenzstärke anpassen; kein Ich-Denken mit `I think` oder `I believe`
- Jede Behauptung in der Claim-Evidence Map einer Evidenz zuordnen; unbelegte Behauptungen abschwächen oder entfernen

**Workflow:** 6 Schritte — RUBRIK/ENTWURF LESEN und Einschränkungen zitieren, Absätze als Topic-Support-Conclude PLANEN, unter allen vier Protokollen ENTWERFEN, anhand der Anti-KI-Checkliste PRÜFEN, REVERSE-OUTLINE + Claim-Evidence Map erstellen, POLIEREN (laut lesen, Kohäsion, Spezifität, Wortzahl, Rhythmus).

**Ressourcen:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md` sowie die gemeinsamen Ressourcen `context-loading` und `quality-principles`.

---

### oma-deepsec

**Domäne:** Vercels agentengestützten Schwachstellenscanner `deepsec` in einem Ziel-Repository vollständig, sicher und kostenbewusst steuern.

**Einsatzbereich:** deepsec erstmals in einem Repository installieren (`init`, `INFO.md` schreiben, Kalibrierungsscan), einen vollständigen oder begrenzten Scan ausführen und Befunde verarbeiten, ein PR-CI-Gate mit `process --diff` einrichten, projektspezifische Matcher schreiben, einen Befund-Backlog triagieren (Schweregrad-Buckets, False-Positive-Kürzung mit `revalidate`, Export) sowie deepsec-Fehler untersuchen.

**Nicht verwenden bei:** Allgemeinem OWASP- oder Lint-Review ohne deepsec (oma-qa verwenden), allgemeinen CVE- oder Dependency-Hinweisen (oma-qa oder oma-search verwenden), Architektur einer nicht auf deepsec basierenden SAST-Pipeline (oma-architecture verwenden), Schreiben oder Prüfen von Anwendungscode (an oma-backend/frontend/mobile routen), Cloud-/IAM-/Terraform-Härtung (oma-tf-infra verwenden) oder der Behebung eines Befunds im Produktcode (nach dem deepsec-Befund oma-debug verwenden).

**Kernregeln:**
- Niemals ein unbegrenztes `process` in einem Repository starten, dessen Größe nicht gemessen wurde; bei unbekannter Dateizahl oder mehr als 500 Dateien zuerst mit `--limit 50 --concurrency 5` kalibrieren
- Kosten und Abbruchbedingung vor jedem KI-Durchlauf nennen (ungefähr $25–60 für 100 Dateien bis $500–1.200 für 2.000, mit einer Schwankung um den Faktor 2–3)
- Fortsetzen statt zurücksetzen: Nach Quota-, Netzwerk- oder Ctrl-C-Unterbrechung denselben Befehl erneut ausführen; `data/<id>/` niemals löschen, um neu zu beginnen
- `INFO.md` kurz und projektspezifisch halten (50–100 Zeilen, 3–5 Beispiele pro Abschnitt)
- Für PR-/CI-Gates das Zwei-Job-Muster verwenden; dem Job, der PR-kontrollierten Code ausführt, niemals `pull-requests: write` geben; Actions in Produktion auf vollständige SHAs pinnen
- Vor dem ersten kostenpflichtigen Aufruf die Agentenwahl (`codex`/`gpt-5.5` oder `claude`/`claude-opus-4-8`) erfragen; Zugangsdaten niemals ausgeben oder committen

**Workflow:** PREPARE (Absicht, Repository-Root, Zugangsdaten, Budget, Schweregradgrenze, Agent) → ACQUIRE (Konfiguration, `INFO.md`, Laufhistorie, Repository-Signale) → REASON (kleinsten ausreichenden Durchlauf wählen) → ACT (aus `.deepsec/` heraus ausführen) → VERIFY (`status`, `RunMeta`, Exit-Code) → FINALIZE (Befunde nach Schweregrad/Urteil, Dollar-Kosten, Folgeaufgaben).

**Ressourcen:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Domäne:** Dokumentationsdrift erkennen: Verweise in `docs/**/*.md` gegen die aktuelle Codebasis prüfen (Verify-Modus) und Patches für diff-betroffene Dokumente vorschlagen (Sync-Modus).

**Einsatzbereich:** Nach Refactorings, Umbenennungen oder Dateilöschungen veraltete Dokumentationsverweise finden, vor einem Release CLI-Befehle, Dateipfade und Konfigurationsschlüssel bestätigen, nach einem größeren Git-Diff Dokumente finden, die geänderte Dateien referenzieren, sowie regelmäßige Drift-Prüfungen in dokumentationslastigen Repositories.

**Nicht verwenden bei:** Dokumente für bisher undokumentierte Features von Grund auf erstellen, mehrsprachige Dokumentübersetzung (oma-translation verwenden), symbolgenaue semantische Drift oder CI-blockierende Durchsetzung (v1 meldet nur Warnungen).

**Kernregeln:**
- `.agents/` niemals bearbeiten (SSOT-Schutz)
- Sync-Patches niemals automatisch anwenden; Sync ist immer interaktiv (pro Dokument ist `[y]` erforderlich)
- Wenn das LLM nicht verfügbar ist, kontrolliert degradieren: Verify fällt auf rohes JSON zurück, Sync auf eine Kandidatenliste
- Dateien mit Geheimnissen (`.env*`, `*.pem`, `*.key`, `id_rsa*`, von Git ignorierte Dateien) erscheinen nie in der Sync-Ausgabe
- Keine direkten LLM-API-Aufrufe aus der CLI: Sie erzeugt strukturierte Daten; das Host-LLM übernimmt Synthese und Patch-Entwurf (vendorneutral)
- URL-Prüfung wird an `lychee` delegiert; der Hook ist in v1 warn-only und blockiert den Workflowabschluss nie

**Workflow:** Verify-Modus — extrahieren → auflösen → berichten (deterministische CLI, Exit 0 bei sauberem Ergebnis / 1 bei Fehlern). Sync-Modus — Git-Diff → Rückwärtssuche → Kandidatenliste → Host-LLM-Patchvorschläge → interaktiv annehmen/ablehnen → `doc-refs.json` neu erzeugen.

**Ressourcen:** Verwendet nur gemeinsame Ressourcen; die Implementierung liegt in `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-explanation

**Domäne:** Interaktive Erklärungen für Codeänderungen.

**Einsatzbereich:** Einen Diff, Pull Request, Branch oder Commit-Bereich für Leser erklären, die Hintergrund, Intuition, Code-Walkthrough und ein kurzes Quiz in einem offlinefähigen HTML-Artefakt benötigen.

**Workflow:** Liest die angeforderte Änderung, erstellt eine eigenständige HTML-Erklärung mit den Abschnitten Background / Intuition / Code / Quiz, validiert das Artefakt und schreibt es unter `.agents/results/explain/`.

**Nicht verwenden bei:** Einer normalen Dokumentationsseite, einer laufenden Feature-Implementierung oder einer Präsentation (für Präsentationen `oma-slide` verwenden).

**Ressourcen:** Verwendet die gemeinsamen Ressourcen für Ausführung und Qualität sowie die Artefaktvalidierung des `/explain`-Workflows.

---

### oma-image

**Domäne:** Multi-Vendor-KI-Bilderzeugung mit authentifizierungsbewusstem Parallel-Dispatch (Codex `gpt-image-2`, Antigravity-Gemini-Modelle der Familie „nano-banana“ über `agy` mit intern gewähltem Modell, Pollinations flux/zimage).

**Einsatzbereich:** Bilder, visuelle Assets, Illustrationen, Produktfotos, Konzeptkunst oder Mockups erzeugen, die Ausgabe mehrerer Bildmodelle für denselben Prompt vergleichen oder Bilder aus Prompts in Editor-Workflows erzeugen.

**Nicht verwenden bei:** Bearbeiten bestehender Bilder oder Fotos, Video- oder Audioerzeugung (oma-video / oma-voice verwenden), Inline-Vektor-/SVG-Komposition aus strukturierten Daten oder einfachem Skalieren bzw. Konvertieren von Assets.

**Kernregeln:**
- Vor dem Aufruf klären: Bei unklarem Motiv, Stil, Aufbau oder Verwendungszweck zuerst fragen oder den Prompt ausbauen und die erweiterte Fassung zeigen
- Authentifizierungsbewusst dispatchen: nur authentifizierte Vendors ausführen; mit `--vendor all` müssen alle angeforderten Vendors verfügbar sein
- Kostengrenze: Vor Läufen mit erwarteten Kosten ab $0.20 bestätigen (`--yes`/`OMA_IMAGE_YES=1` umgehen die Bestätigung); `pollinations` und `antigravity` sind standardmäßig kostenlos
- Pfadsicherheit: Ausgabe außerhalb von `$PWD` erfordert `--allow-external-output`; `n` ist auf 5 begrenzt
- Aufgezeichnete Ausgaben: Jeder Lauf schreibt neben den Bildern ein `manifest.json` mit Prompt, Vendor/Modell, Eingaben und Artefaktmetadaten. Es hält Reproduzierbarkeitsdaten fest, verspricht aber keine pixelidentischen Bilder.
- Angefügte Referenzbilder automatisch über `--reference <path>` weiterreichen (codex/antigravity)

**Workflow:** PREPARE (Prompt klären/erweitern, Vendor wählen) → ACQUIRE (Authentifizierung, Referenzen und Ausgabepfad prüfen) → ACT (`oma image generate`) → VERIFY (Manifest, Dateien, Exit-Code) → FINALIZE (Ausgabepfade + Warnungen).

**Ressourcen:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md` sowie `config/image-config.yaml`.

---

### oma-market

**Domäne:** Marktforschung aus Community-Signalen: Schmerzpunkte, Trends, Wettbewerbspositionierung und Entdeckung. Die Recherche läuft auf der Upstream-Engine [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, Web und weitere), die OMA automatisch auf der neuesten Version hält.

**Einsatzbereich:** Reale Schmerzpunkte aus Community-Beiträgen extrahieren, Trends in einer Kategorie über 7/30/90/180 Tage erkennen, Wettbewerberstimmung mit SWOT-/Porter-5F-Positionierung analysieren, offene Entdeckung mit `--discover`, Personen-, Unternehmens- oder Ticker-Recherche, Hiring-Signale und Folgeuntersuchungen.

**Nicht verwenden bei:** Allgemeiner Webrecherche ohne Marktrahmen (oma-search direkt verwenden), akademischer Literatur (oma-scholar verwenden), Live-Dashboards oder geplanter Überwachung (mit `oma schedule <action>` umschließen).

**Kernregeln:**
- Zuerst detect-trap: die Engine nie ohne Preflight ausführen (`--force` nur nach ausdrücklicher erneuter Bestätigung)
- Eine Engine, immer aktuell: `oma market resolve` aktualisiert vor der Verwendung die verwaltete Kopie (`~/.cache/oma-market/last30days/<tag>/`); eine veraltete benutzerinstallierte Kopie ist nur ein Fallback, wenn offline nichts gecacht ist
- Die `SKILL.md` der aufgelösten Engine wörtlich befolgen; einzige Ersetzung ist `oma market run <args>` anstelle des rohen Aufrufs `python3 scripts/last30days.py`
- Niemals nur WebSearch: Keine Engine, Python 3.12+ oder ein Exit ungleich null bedeutet stoppen und melden
- Schlüsselbasierte Quellen nur über den Upstream-Einrichtungsassistenten mit Einwilligung des Benutzers aktivieren; übersprungene Quellen im Footer sichtbar halten
- Frameworks nur mit Engine-Clustern belegen; Badge in der ersten Zeile und Upstream-LAWs vor dem Schreiben der Datei erzwingen
- Ein Brief pro Lauf unter `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; Frameworks werden nach Absicht automatisch gewählt (Schmerz/Trend → SWOT, Wettbewerber → SWOT + Porter's 5F, Discovery → SWOT + PESTEL)

**Workflow:** detect-trap → `oma market resolve` → Upstream-`SKILL.md` lesen → Upstream-Vorrecherche (Einrichtungsassistent, Handle-/Subreddit-Auflösung, Abfrageplan) → `oma market run … --emit=compact` → gemäß Upstream-OUTPUT-CONTRACT synthetisieren → Frameworks anhängen → Selbstprüfung → schreiben.

**Ressourcen:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md` sowie `frameworks/` (swot, porters-5f, pestel). CLI: `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Domäne:** Verhaltenserhaltendes Refactoring: sichere inkrementelle Umstrukturierung mit Code-Smell-, SATD- und Hotspot-Fokus, Sicherheitsnetzen aus Charakterisierungstests und reinen Refactor-Commits.

**Einsatzbereich:** Refactoring bestimmter Dateien oder Module ausführen (extrahieren, verschieben, umbenennen, zerlegen, Idiome angleichen), vorbereitendes Refactoring vor einem Feature, Legacy-/Brownfield-Rettung (Seam-Findung + Charakterisierungstests), Refactoring-Ziele nach Hotspot (Churn × Komplexität) auswählen oder prüfen, ob Code jetzt sicher refaktoriert werden kann.

**Nicht verwenden bei:** Beheben eines gemeldeten Bugs oder fehlerhaften Verhaltens (oma-debug verwenden; Refactoring darf Verhalten nicht ändern), Sicherheits-/Performance-/Barrierefreiheitsprüfung (oma-qa verwenden), Systemdesign, Modulgrenzen oder ADRs (oma-architecture verwenden), DB-Schemaentwurf oder Migrationen (oma-db verwenden), Commit-Aufteilung oder Staging (oma-scm verwenden) oder Performanceoptimierung als Ziel.

**Kernregeln:**
- Verhalten erhalten: Der Verbrauchervertrag (Hyrum-bewusst) ist unverletzlich; Tuning ist Nebenwirkung, nie Ziel
- Überprüfbar: Nie ohne Sicherheitsnetz umstrukturieren; fehlt es oder ist es schwach, zuerst Charakterisierungstests (Golden Master) als getrennte Commits schreiben
- Inkrementell: Eine benannte Transformation pro Commit; bei wiederholtem Fehlschlag Mikado verwenden (Voraussetzung notieren, vollständig zurücksetzen, rekursiv fortfahren)
- Getrennt (zwei Hüte): Verhaltensänderungen nie mit Refactor-Commits mischen (`refactor:`-Typ verwenden)
- Wirtschaftlich: Lesbarkeit ist das Hauptziel; Code, der gelöscht werden soll, oder kalter Code mit wenig Änderungsaktivität wird nicht refaktoriert
- Abweichungen von Konventionen über den ADR-Weg von oma-architecture klären, nicht lokal ändern; alle Metriken sind nur Näherungen (Goodhart)

**Workflow:** PREPARE (Greenfield/Brownfield klassifizieren, Größen-Gates, Hotspots ordnen) → ACQUIRE (Code mit Symboltools lesen, Metriken und Git-Signale sammeln) → REASON (atomare Transformationsfolge / Expand-Contract planen) → ACT (eine Engine-first-Transformation) → VERIFY (Tests unverändert erneut ausführen → committen oder Mikado-Rücksetzung) → FINALIZE (Metrikdelta + Lesbarkeitsurteil).

**Ressourcen:** `definition.md`, `measurement.md`, `governance.md` sowie die gemeinsamen Ressourcen `context-loading` und `quality-principles`.

---

### oma-scholar

**Domäne:** Wissenschaftlicher Recherchebegleiter mit der Knows-Sidecar-Spezifikation `.knows.yaml`: strukturierte Paper-Sidecars erzeugen, validieren, prüfen, abfragen und vergleichen sowie von knows.academy abrufen.

**Einsatzbereich:** Papers tokeneffizient über Sidecars lesen (ungefähr 700 Tokens nur für Claims statt etwa 10K beim vollständigen PDF), `.knows.yaml` aus Entwürfen, LaTeX oder Notizen erzeugen, Sidecar-Struktur vor dem Teilen validieren, Peer-Reviews als Sidecars erstellen, vorhandene Sidecars abfragen oder zusammenfassen, zwei Papers strukturell vergleichen sowie knows.academy durchsuchen und daraus abrufen.

**Nicht verwenden bei:** Allgemeiner Websuche oder nichtakademischen Inhalten (oma-search verwenden), Übersetzen von Papers (oma-translation verwenden), reiner PDF-Analyse ohne Sidecar (oma-pdf verwenden) oder vollständigem Peer-Review-Workflow mit Editorsystem.

**Modi:** Generate, Validate, Review, Analyze, Compare, Remote (Suche/Abruf).

**Kernregeln:**
- Zielspezifikation ist Profil v0.9.0 / `paper@1`; das Host-LLM erzeugt Sidecars (niemals ein externes LLM-SDK per Shell aufrufen)
- Anti-Fabrikation: Wenn DOI, Venue oder Jahr in der Quelle nicht sichtbar sind, Schlüssel vollständig auslassen; niemals `doi: TODO` schreiben oder raten
- Exakte Feldnamen, genau ein `provenance.actor`-Objekt, geschlossene Enums, unquotierte Zahlen
- Relation-Dichte ≥ 1,5 pro Aussage; jeder Claim benötigt Evidenz in `supported_by`
- Vor dem Teilen validieren (`oma scholar lint`); für Sidecars Dritter `--lenient` verwenden
- knows.academy → OpenAlex-Fallback für ältere oder nicht aus 2026 stammende Papers; die öffentliche Proxy-API benötigt keine Authentifizierung

**Workflow:** PREPARE (Modus + Quelle) → ACQUIRE (Metadaten, Abschnitte oder lokalen Text) → REASON (Claims, Evidenz und Relationen extrahieren) → ACT (erzeugen/linten/reviewen/analysieren/vergleichen/abrufen) → VERIFY (Schema, Enums, IDs, Relationen) → FINALIZE (Sidecar/Bericht/Zusammenfassung mit Einschränkungen).

**Ressourcen:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md` sowie `config/scholar-config.yaml`.

---

### oma-skill-creation

**Domäne:** OMA-Skills im SSL-lite-Markdown-Format (Scheduling / Structural Flow / Logical Operations / References) schreiben und validieren.

**Einsatzbereich:** Einen neuen Skill unter `.agents/skills/{name}/SKILL.md` erstellen, einen vorhandenen Skill auf das SSL-lite-Format umstellen, einen kanonischen Befehls-/Workflow-Pfad zu einem ausführungsintensiven Skill hinzufügen, Routing-, Ausführungs- und Validierungsdetails prüfen oder entscheiden, ob Beispiele inline oder in `resources/` gehören.

**Nicht verwenden bei:** Drittanbieter-Skills in `$CODEX_HOME/skills` installieren (extern), ein Codex-Plugin-Bundle erstellen (extern), einen allgemeinen Projektplan ohne Skill-Autorenschaft schreiben (oma-pm verwenden) oder Produkt-/Infrastruktur-/Frontend-/Backend-/Mobile-Code direkt bearbeiten (passenden Spezialisten verwenden).

**Kernregeln:**
- Die vier obersten Abschnitte exakt beibehalten: Scheduling, Structural Flow, Logical Operations, References
- YAML-Frontmatter mit eindeutigem `name` und `description` beibehalten; nach einer Beschreibungsergänzung `oma skill audit` ausführen (Warnung ab 60 %, Fehler ab 75 % TF-IDF-Kosinus-Kollision)
- Konkrete `When NOT to use`-Grenzen mit Verweisen auf benachbarte Skills aufnehmen
- Genau einen kanonischen Inline-Pfad aufnehmen (`Canonical command path` für fragile/wiederholbare Befehle, `Canonical workflow path` für Ermessens- oder Rechercheabläufe)
- Lange variantenabhängige Details in `resources/` statt im Haupttext ablegen; keine README-, Changelog- oder Installationsdokumente in einem Skill anlegen

**Workflow:** PREPARE (Zweck, Auslöser, Grenzen, Ein-/Ausgaben, Abhängigkeiten) → ACQUIRE (1–3 analoge Skills + Konventionen lesen) → REASON (inline vs. `resources/`) → ACT (aus SSL-lite-Vorlage entwerfen) → VERIFY (Struktur-, Routing-, Ausführungs- und Formatierungsprüfungen) → FINALIZE (geänderte Dateien + Validierungsbericht).

**Ressourcen:** `ssl-lite-template.md`, `validation-checklist.md` sowie die gemeinsamen Ressourcen `context-loading` und `quality-principles`.

---

### oma-slide

**Domäne:** Animationsreiche HTML-Präsentationen auf einer festen Bühne mit 1920×1080 erzeugen und deterministisch über die `oma slide`-CLI als PDF/PNG/PPTX validieren, bündeln und exportieren.

**Einsatzbereich:** Eine Präsentation aus Thema oder Gliederung erstellen, ein vorhandenes Deck verbessern oder neu formatieren, animiertes Slide-HTML mit Design-Doctrine-Ästhetik erzeugen, ein Deck als PDF/PNG/PPTX exportieren, ein benanntes Style-Preset anwenden sowie aus Canva exportieren oder dorthin importieren.

**Nicht verwenden bei:** Normalen Dokumenten ohne Folien, alleiniger Bilderzeugung (direkt oma-image verwenden), Definition einer Marke oder eines Design-Systems (oma-design verwenden), rein deterministischen CLI-Operationen (Validieren/Bündeln/Exportieren ohne Erzeugung; `oma slide` direkt aufrufen).

**Kernregeln:**
- Der Skill schreibt HTML; die CLI übernimmt alles Weitere (Scaffold, Validierung, Bündelung, Export)
- Nur lokale Assets: keine externen URLs in `<img src>`/`<video src>`, ausschließlich `./assets/<file>`
- CJK → Pretendard-Schrift für jede koreanische, japanische oder chinesische Folie erforderlich
- `prefers-reduced-motion`-Wrapper, sichtbare Fokuszustände und `data-om-validate` auf jeder Folie erforderlich
- Höchstens 3 automatische Korrekturschleifen bei der Validierung, danach Diff dem Benutzer vorlegen
- Bilderzeugung an oma-image delegieren; Canva MCP ist optional und wird nur mit ausdrücklicher Zustimmung des Benutzers automatisch bereitgestellt

**Workflow:** 7 Phasen — DETECT (Modus), DISCOVER (Assets klären und bewerten), STYLE (3 Live-Vorschauen → Benutzer wählt), GENERATE (`slide-NN.html` bei 1920×1080), VALIDATE (`oma slide validate`, höchstens 3 automatische Korrekturschleifen), REVIEW (Viewer + optionaler Bounding-Box-Editor), DELIVER (`bundle` + optionaler PDF/PNG/PPTX-Export).

**Ressourcen:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md` sowie ein `assets/`-Verzeichnis.

---

### oma-video

**Domäne:** Kurz-, Erklär- und menschengeführte Demo-Videos über die `oma video`-CLI erzeugen; dabei Skript → Narration → Visuals → Untertitel → HyperFrames-Rendering komponieren.

**Einsatzbereich:** Kurzvideos (Shorts/Reels, 9:16) aus einem Thema, Erklärvideos (16:9/9:16) aus README/Code/Daten, Demos und Walkthroughs aus einem Screen-Capture (`--source file`) oder einer überwachten Browseraufnahme einer beliebigen URL (`--source web`) erzeugen sowie einen vorhandenen Lauf deterministisch neu rendern.

**Nicht verwenden bei:** Einzelnes Standbild erzeugen (oma-image verwenden), ein Slide-Deck erzeugen (oma-slide verwenden; Video ruft es intern für Erklärbilder auf), nur Sprach-Audio erzeugen (oma-voice verwenden), nichtlinearem Schnitt eines fertigen MP4 oder Livestreaming (überwachtes Web-Capture ist enthalten).

**Kernregeln:**
- Modus vor dem Aufruf klären oder ableiten; den abgeleiteten Plan zeigen, statt aus einem vagen Brief still zu rendern
- Provider-Konfiguration ist für unterstützte Asset-Fallbacks optional; kostenpflichtige Provider (Pexels, Pixelle) werden nur aktiviert, wenn ihr Env-Key vorhanden ist, während ein Compositor-Fehler niemals durch ein Fallback-Video ersetzt wird
- Kostengrenze ab `$0.20` (`--yes`/`OMA_VIDEO_YES=1` umgehen sie); Begrenzung auf 180 Sekunden / 40 Szenen
- Rendereingaben werden in `render-spec.json`, Assets, Seed und eingebettetem Pretendard aufgezeichnet; `OMA_VIDEO_MOCK=1` ist ein Test-Harness für Golden Fixtures, kein Benutzerartefakt
- Demo ist Human-in-the-Loop: Web-Capture öffnet nur einen sichtbaren Browser und zeichnet auf, während ein Mensch den Ablauf steuert — keine automatisierte Zugangsdatenverarbeitung; `--url` und Tokens werden in Logs/Manifest maskiert
- Pfadsicherheit (`--allow-external-output` für Ausgabe außerhalb von `$PWD`)

**Workflow:** PREPARE (Modus/Seitenverhältnis/Locale, Brief klären/erweitern) → ACQUIRE (Providerverfügbarkeit abfragen, Capture-Pfad validieren, Kosten prüfen) → ACT (Skript → Stimme ∥ Visuals ∥ Untertitel → Render-Spezifikation → Render) → VERIFY (Schema, Manifest-Hashes, Exit-Code, MP4) → FINALIZE (Laufverzeichnis + MP4-Pfad + Abdeckungswarnungen).

**Ressourcen:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md` sowie die `hyperframes-authoring/`-Modusleitfäden, der Web-Capture-Treiber und der `mpt/`-Fallback-Compositor; `config/video-config.yaml`.

---

### oma-voice

**Domäne:** Local-first Text-to-Speech und Speech-to-Text über den Voicebox-MCP-Server — vollständig auf dem Gerät, ohne Cloud, API-Schlüssel oder Kosten pro Aufruf.

**Einsatzbereich:** Kurze Benachrichtigungsaudios für den Abschluss oder Blocker einer Agentenaufgabe erzeugen, Voiceover/Narration/Audio-Assets (mp3 oder wav) erstellen, lokale Audiodateien (mp3, wav, m4a, webm, flac) in Markdown transkribieren oder Sprachprofile durch denselben Text mit verschiedenen Profil-IDs vergleichen.

**Nicht verwenden bei:** Cloud-TTS oder hochauflösenden mehrsprachigen Cloud-Stimmen, Echtzeit-Diktat über ein Terminalmikrofon (Voicebox-Hotkey-Diktat verwenden), Hochladen von Cloning-Samples oder Anlegen von Profilen (erfolgt in der Voicebox-Desktop-App) sowie Video-, Musik- oder Sounddesign.

**Kernregeln:**
- Voicebox erforderlich: Bei Handshake- oder `GET /health`-Fehler einmalig Installations-/Start-Hinweis ausgeben, nicht erneut versuchen oder automatisch neu starten
- Profil erforderlich: Wenn `voicebox_list_profiles` leer ist, auf die App-Oberfläche verweisen und beenden
- Längenlimits: TTS maximal 5000 Zeichen pro Aufruf (Warnung ab 2000), STT maximal 30 Minuten; v1 teilt nicht automatisch in Blöcke
- Transparenz bei automatischem Aufruf: Benachrichtigungen nur auslösen, wenn die Aufgabe länger als `auto_notify_after_sec` (Standard 60 s) dauert; Absicht immer in einer Zeile ankündigen
- Pfadsicherheit (Warnung + Bestätigung bei Ausgabe außerhalb von `$PWD`); SIGINT schreibt keine Teilausgabe
- Bei jeder Erzeugung ein Manifest schreiben; keine Kostengrenze (Voicebox ist kostenlos)

**Workflow:** PREPARE (Text/Audio/Sprache/Pfad/Profil validieren) → ACQUIRE (bei fehlendem Signal einmal klären) → ACT (MCP `voicebox_speak` oder `voicebox_transcribe`) → VERIFY (Audio/Transkript vorhanden + Manifestfelder) → FINALIZE (`manifest.json` schreiben, Pfad melden).

**Ressourcen:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md` sowie `config/voice-config.yaml`.

---

## Charter Preflight (CHARTER_CHECK)

Vor dem Schreiben jeglichen Codes muss jeder Implementierungsagent einen CHARTER_CHECK-Block ausgeben:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Zweck:**
- Deklariert, was der Agent tun und nicht tun wird
- Erkennt Scope-Creep, bevor Code geschrieben wird
- Macht Annahmen explizit für die Benutzerprüfung
- Liefert testbare Erfolgskriterien

**Klärungsebenen:**
- **LOW**: Klare Anforderungen. Mit den genannten Annahmen fortfahren.
- **MEDIUM**: Teilweise mehrdeutig. Optionen auflisten, mit der wahrscheinlichsten fortfahren.
- **HIGH**: Sehr mehrdeutig. Status auf blockiert setzen, Fragen auflisten, KEINEN Code schreiben.

`oma verify agent <agent-type> --workspace <workspace>` prüft den ausgewählten Agententyp. Der Ablauf `/ralph` ergänzt artefaktbasierte Verifikation und eine Judge-Schleife; aktivierte Vendor-Stop-Hooks können einen Workflow offenhalten, während seine konfigurierten Prüfungen laufen. Allein das Laden eines Skills ist keine Abnahme, und ein einfacher Prompt führt nicht automatisch jedes Workflow-Gate aus. Entscheidend sind die Akzeptanzkriterien des Workflows und die erzeugten Dateien.

Im Subagenten-Modus (CLI-gestartet) können Agenten Benutzer nicht direkt befragen. LOW fährt fort, MEDIUM grenzt ein und interpretiert, HIGH blockiert und gibt Fragen an den Orchestrator zur Weiterleitung zurück.

---

## Zwei-Schichten-Skill-Loading

Das Wissen jedes Agenten ist auf zwei Schichten aufgeteilt:

**Schicht 1 — SKILL.md (beim Routing des Skills geladen):**
Enthält Frontmatter (Name, Beschreibung), Einsatz-/Nicht-Einsatz-Bedingungen, Kernregeln, Architekturübersicht, Bibliotheksliste und Verweise auf Schicht-2-Ressourcen.

**Schicht 2 — resources/ (bedarfsgesteuert geladen):**
Wird nur geladen, wenn der Agent aktiv arbeitet, und nur mit den Ressourcen, die die Aufgabe braucht. Der Schwierigkeitsgrad legt ein weiches Token-Budget fest, keine feste Dateiliste; siehe [Ressourcenladen nach Aufgabe](./skills.md#resource-loading-by-task).

Zusätzliche Ressourcen werden während der Ausführung nach Bedarf geladen:
- `checklist.md` — beim Verifikationsschritt
- `error-playbook.md` — nur wenn Fehler auftreten
- `common-checklist.md` — für die abschließende Verifikation komplexer Aufgaben

---

## Begrenzte Ausführung

Agenten arbeiten unter strikten Domänengrenzen:

- Ein Frontend-Agent wird keinen Backend-Code modifizieren
- Ein Backend-Agent wird keine UI-Komponenten berühren
- Ein DB-Agent wird keine API-Endpunkte implementieren
- Agenten dokumentieren domänenfremde Abhängigkeiten für andere Agenten

Wird während der Ausführung eine Aufgabe entdeckt, die zu einer anderen Domäne gehört, dokumentiert der Agent sie in seiner Ergebnisdatei als Eskalationspunkt, anstatt sie selbst zu bearbeiten.

---

## Workspace-Strategie

Für Multi-Agenten-Projekte verhindern separate Workspaces Dateikonflikte:

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Workspaces werden mit dem `-w`-Flag beim Starten von Agenten angegeben:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Orchestrierungs-Ablauf

Beim Ausführen eines Multi-Agenten-Workflows (`/orchestrate` oder `/work`):

1. **PM-Agent** zerlegt die Anfrage in domänenspezifische Aufgaben mit Prioritäten (P0, P1, P2) und Abhängigkeiten
2. **Sitzung initialisiert** — Sitzungs-ID generiert, `orchestrator-session-{sessionId}.md` und `task-board-{sessionId}.md` im konfigurierten Memory erstellt
3. **P0-Aufgaben** werden parallel gestartet (bis zu MAX_PARALLEL gleichzeitige Agenten)
4. **Fortschritt überwacht** — Orchestrator fragt die run-bezogenen Dateien `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` alle POLL_INTERVAL ab
5. **P1-Aufgaben** werden nach Abschluss von P0 gestartet, und so weiter
6. **Verifikationsschleife** läuft für jeden abgeschlossenen Agenten (Selbst-Review -> automatische Verifikation -> Gegen-Review durch QA)
7. **Ergebnisse gesammelt** aus den run-bezogenen Dateien `result-{agentId}-{taskId}-{runId}-{sessionId}.md`
8. **Abschlussbericht** mit Sitzungszusammenfassung, geänderten Dateien, verbleibenden Problemen

---

## Agenten-Definitionen

Agenten werden an zwei Stellen definiert:

**`.agents/agents/`** — Enthält 12 eingecheckte Subagent-Definitionsdateien, darunter:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

Diese Dateien definieren die Identität des Agenten, den Verweis auf das Ausführungsprotokoll, die CHARTER_CHECK-Vorlage, die Architekturzusammenfassung und die Regeln. Sie werden beim Starten von Subagenten über das Task-/Agent-Tool (Claude Code) oder die CLI verwendet.

Die Laufzeit stellt außerdem 13 kanonische Dispatch-Rollen bereit: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` und `explore`. `research-explorer.md` ist die eingecheckte Definition für den Alias `explore`; `orchestrator` ist eine Laufzeit-Koordinationsrolle ohne eigene Definitionsdatei.

**Vendor-native Projektionen:** OMA materialisiert die Quelldefinitionen in laufzeitspezifische Agentendateien:
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` und andere unterstützte Projektionen des ausgewählten Vendors

Diese generierten Dateien werden von `oma link`, `oma install` und `oma update` aktualisiert.

---

## Laufzeitzustand (Projekt-Memory-Speicher)

Während Orchestrierungssitzungen koordinieren sich Agenten über gemeinsame Memory-Dateien in `.agents/state/memories/` (ältere Projekte greifen auf den Legacy-Pfad `.serena/memories/` zurück; konfigurierbar über `mcp.json`):

| Datei | Eigentümer | Zweck | Andere |
|------|-------|---------|--------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Sitzungs-ID, Status, Startzeit, Phasenverfolgung | Nur lesend |
| `task-board-{sessionId}.md` | Orchestrator | Aufgabenzuweisungen, Prioritäten, Statusaktualisierungen | Nur lesend |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Dieser Lauf | Zugweiser Fortschritt: durchgeführte Aktionen, gelesene/modifizierte Dateien, aktueller Status | Orchestrator liest |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Dieser Lauf | Endergebnis: Status (abgeschlossen/fehlgeschlagen), Zusammenfassung, geänderte Dateien, Akzeptanzkriterien-Checkliste | Orchestrator liest |
| `session-metrics.md` | Orchestrator | Optionale Sitzungsbelege und gemessene Experimentergebnisse | QA liest |
| `experiment-ledger.md` | Orchestrator/QA | Belege für tatsächliche Experimente | Alle lesen |

Memory-Tools sind konfigurierbar. Standardmäßig lesen und schreiben Agenten diese Koordinationsdateien direkt mit ihren nativen Dateitools (`Read`, `Write`, `Edit`); benutzerdefinierte Tools und ein eigener Basispfad können in `mcp.json` konfiguriert werden:

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

Dashboards (`oma dashboard terminal` und `oma dashboard web`) überwachen diese Memory-Dateien für Echtzeit-Monitoring.
