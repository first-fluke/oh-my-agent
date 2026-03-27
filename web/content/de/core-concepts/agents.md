---
title: Agenten
description: Vollständige Referenz aller 14 oh-my-agent-Agenten — ihre Domänen, Tech-Stacks, Ressourcendateien, Fähigkeiten, Charter-Preflight-Protokoll, Zwei-Schichten-Skill-Loading, Regeln für begrenzte Ausführung, Qualitäts-Gates, Workspace-Strategie, Orchestrierungs-Ablauf und Laufzeit-Speicher.
---

# Agenten

Agenten in oh-my-agent sind spezialisierte Engineering-Rollen. Jeder Agent verfügt über eine definierte Domäne, Tech-Stack-Wissen, Ressourcendateien, Qualitäts-Gates und Ausführungsbeschränkungen. Agenten sind keine generischen Chatbots — sie sind bereichsbeschränkte Arbeiter, die in ihrem Zuständigkeitsbereich bleiben und strukturierte Protokolle befolgen.

---

## Agenten-Kategorien

| Kategorie | Agenten | Zuständigkeit |
|----------|--------|---------------|
| **Ideenfindung** | oma-brainstorm | Ideen erkunden, Ansätze vorschlagen, Designdokumente erstellen |
| **Planung** | oma-pm | Anforderungszerlegung, Aufgabenaufschlüsselung, API-Verträge, Prioritätszuweisung |
| **Implementierung** | oma-frontend, oma-backend, oma-mobile, oma-db | Produktionscode in ihren jeweiligen Domänen schreiben |
| **Design** | oma-design | Design-Systeme, DESIGN.md, Tokens, Typografie, Farbe, Bewegung, Barrierefreiheit |
| **Infrastruktur** | oma-tf-infra | Multi-Cloud-Terraform-Bereitstellung, IAM, Kostenoptimierung, Policy-as-Code |
| **DevOps** | oma-dev-workflow | mise Task Runner, CI/CD, Migrationen, Release-Koordination, Monorepo-Automatisierung |
| **Qualität** | oma-qa | Sicherheitsaudit (OWASP), Performance, Barrierefreiheit (WCAG), Code-Qualitäts-Review |
| **Debugging** | oma-debug | Bug-Reproduktion, Grundursachenanalyse, minimale Korrekturen, Regressionstests |
| **Lokalisierung** | oma-translator | Kontextbewusste Übersetzung unter Bewahrung von Ton, Register und Fachbegriffen |
| **Koordination** | oma-orchestrator, oma-coordination | Automatisierte und manuelle Multi-Agenten-Orchestrierung |
| **Git** | oma-commit | Conventional-Commits-Generierung, Feature-basierte Commit-Aufteilung |

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

**Ressourcen:** Verwendet nur gemeinsame Ressourcen (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

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

**Ausgabe:** `.agents/plan.json`, `.agents/brain/current-plan.md`, Memory-Eintrag für Orchestrator.

**Ressourcen:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Zug-Limits:** Standard 10, Maximum 15.

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
| Hooks | ahooks |
| Hilfsfunktionen | es-toolkit |
| URL-Status | nuqs |
| Server-Status | TanStack Query |
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

**Ressourcen:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Qualitäts-Gate-Checkliste:**
- Barrierefreiheit: ARIA-Labels, semantische Überschriften, Tastaturnavigation
- Mobil: auf mobilen Viewports verifiziert
- Performance: kein CLS, schnelle Ladezeit
- Resilienz: Error Boundaries und Lade-Skelette
- Tests: Logik durch Vitest abgedeckt
- Qualität: Typecheck und Lint bestehen

**Zug-Limits:** Standard 20, Maximum 30.

---

### oma-backend

**Domäne:** APIs, serverseitige Logik, Authentifizierung, Datenbankoperationen.

**Einsatzbereich:** REST-/GraphQL-APIs, Datenbankmigrationen, Authentifizierung, serverseitige Geschäftslogik, Hintergrundjobs.

**Architektur:** Router (HTTP) -> Service (Geschäftslogik) -> Repository (Datenzugriff) -> Modelle.

**Stack-Erkennung:** Liest Projektmanifeste (pyproject.toml, package.json, Cargo.toml, go.mod usw.), um Sprache und Framework zu bestimmen. Greift auf das `stack/`-Verzeichnis zurück, falls vorhanden, oder fordert den Benutzer auf, `/stack-set` auszuführen.

**Kernregeln:**
- Clean Architecture: keine Geschäftslogik in Route-Handlern
- Alle Eingaben mit der Validierungsbibliothek des Projekts validiert
- Nur parametrisierte Abfragen (niemals String-Interpolation in SQL)
- JWT + bcrypt für Authentifizierung; Rate-Limiting für Auth-Endpunkte
- Async wo unterstützt; Typannotationen auf allen Signaturen
- Benutzerdefinierte Exceptions über zentrales Fehlermodul
- Explizite ORM-Ladestrategie, Transaktionsgrenzen, sicherer Lebenszyklus

**Ressourcen:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Stack-spezifische Ressourcen in `stack/` (generiert durch `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Zug-Limits:** Standard 20, Maximum 30.

---

### oma-mobile

**Domäne:** Plattformübergreifende mobile Apps — Flutter, React Native.

**Einsatzbereich:** Native mobile Apps (iOS + Android), mobilspezifische UI-Muster, Plattformfunktionen (Kamera, GPS, Push-Benachrichtigungen), Offline-first-Architektur.

**Architektur:** Clean Architecture: Domäne -> Daten -> Präsentation.

**Tech-Stack:** Flutter/Dart, Riverpod/Bloc (Zustandsverwaltung), Dio mit Interceptors (API), GoRouter (Navigation), Material Design 3 (Android) + iOS HIG.

**Kernregeln:**
- Riverpod/Bloc für Zustandsverwaltung (kein rohes setState für komplexe Logik)
- Alle Controller in der `dispose()`-Methode freigeben
- Dio mit Interceptors für API-Aufrufe; Offline-Zustand elegant behandeln
- 60 fps-Ziel; auf beiden Plattformen testen

**Ressourcen:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Zug-Limits:** Standard 20, Maximum 30.

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

**Ressourcen:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus `reference/`-Verzeichnis (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) und `examples/` (design-context-example, landing-page-prompt).

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

**Zug-Limits:** Standard 15, Maximum 20.

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
- In `.agents/brain/bugs/` dokumentieren

**Verwendete Serena-MCP-Tools:**
- `find_symbol("functionName")` — Funktion lokalisieren
- `find_referencing_symbols("Component")` — alle Verwendungen finden
- `search_for_pattern("error pattern")` — ähnliche Probleme finden

**Ressourcen:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Zug-Limits:** Standard 15, Maximum 25.

---

### oma-translator

**Domäne:** Kontextbewusste mehrsprachige Übersetzung.

**Einsatzbereich:** UI-Strings, Dokumentation, Marketingtexte übersetzen, vorhandene Übersetzungen prüfen, Glossare erstellen.

**4-Stufen-Methode:** Quelle analysieren (Register, Absicht, Fachbegriffe, kulturelle Referenzen, emotionale Konnotationen, Zuordnung bildlicher Sprache) -> Bedeutung extrahieren (Quellstruktur entfernen) -> In Zielsprache rekonstruieren (natürliche Wortstellung, Register-Abgleich, Satzaufteilung/-zusammenführung) -> Verifizieren (Natürlichkeitsrubrik + Anti-KI-Musterprüfung).

**Optionaler 7-Stufen-verfeinerter Modus** für Publikationsqualität: erweitert um kritische Überprüfung, Revision und Feinschliff.

**Kernregeln:**
- Vorhandene Locale-Dateien zuerst scannen, um Konventionen zu übernehmen
- Bedeutung übersetzen, nicht Wörter
- Emotionale Konnotationen bewahren
- Niemals wörtliche Übersetzungen produzieren
- Niemals Register innerhalb eines Textes mischen
- Domänenspezifische Terminologie unverändert beibehalten

**Ressourcen:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domäne:** Automatisierte Multi-Agenten-Koordination via CLI-Spawning.

**Einsatzbereich:** Komplexe Features, die mehrere parallele Agenten erfordern, automatisierte Ausführung, Full-Stack-Implementierung.

**Konfigurationsstandards:**

| Einstellung | Standard | Beschreibung |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Maximale gleichzeitige Subagenten |
| MAX_RETRIES | 2 | Wiederholungsversuche pro fehlgeschlagener Aufgabe |
| POLL_INTERVAL | 30 s | Intervall für Statusprüfungen |
| MAX_TURNS (impl) | 20 | Zug-Limit für Backend/Frontend/Mobile |
| MAX_TURNS (review) | 15 | Zug-Limit für QA/Debug |
| MAX_TURNS (plan) | 10 | Zug-Limit für PM |

**Workflow-Phasen:** Plan -> Setup (Sitzungs-ID, Memory-Initialisierung) -> Ausführung (Spawn nach Prioritätsstufe) -> Überwachung (Fortschritt abfragen) -> Verifikation (automatisiert + Gegen-Review-Schleife) -> Zusammenstellung (Ergebnisse zusammentragen).

**Agenten-zu-Agenten-Review-Schleife:**
1. Selbst-Review: Agent prüft eigenen Diff gegen Akzeptanzkriterien
2. Automatische Verifikation: `oh-my-ag verify {agent-type} --workspace {workspace}`
3. Gegen-Review: QA-Agent prüft Änderungen
4. Bei Fehlschlag: Probleme werden zur Behebung zurückgemeldet (maximal 5 Schleifendurchläufe)

**Clarification-Debt-Überwachung:** Verfolgt Benutzerkorrekturen während Sitzungen. Ereignisse werden bewertet: clarify (+10), correct (+25), redo (+40). CD >= 50 löst obligatorische RCA aus. CD >= 80 pausiert die Sitzung.

**Ressourcen:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-commit

**Domäne:** Git-Commit-Generierung nach Conventional Commits.

**Einsatzbereich:** Nach Abschluss von Codeänderungen, bei Ausführung von `/commit`.

**Commit-Typen:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow:** Änderungen analysieren -> Nach Feature aufteilen (wenn > 5 Dateien über verschiedene Scopes/Typen) -> Typ bestimmen -> Scope bestimmen -> Beschreibung schreiben (Imperativ, < 72 Zeichen, Kleinschreibung, kein abschließender Punkt) -> Commit sofort ausführen.

**Regeln:**
- Niemals `git add -A` oder `git add .` verwenden
- Niemals Secrets-Dateien committen
- Beim Staging immer Dateien explizit angeben
- HEREDOC für mehrzeilige Commit-Nachrichten verwenden
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

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

Im Subagenten-Modus (CLI-gestartet) können Agenten Benutzer nicht direkt befragen. LOW fährt fort, MEDIUM grenzt ein und interpretiert, HIGH blockiert und gibt Fragen an den Orchestrator zur Weiterleitung zurück.

---

## Zwei-Schichten-Skill-Loading

Das Wissen jedes Agenten ist auf zwei Schichten aufgeteilt:

**Schicht 1 — SKILL.md (~800 Bytes):**
Wird immer geladen. Enthält Frontmatter (Name, Beschreibung), Einsatz-/Nicht-Einsatz-Bedingungen, Kernregeln, Architekturübersicht, Bibliotheksliste und Verweise auf Schicht-2-Ressourcen.

**Schicht 2 — resources/ (bedarfsgesteuert geladen):**
Wird nur geladen, wenn der Agent aktiv arbeitet, und nur die Ressourcen, die zum Aufgabentyp und Schwierigkeitsgrad passen:

| Schwierigkeitsgrad | Geladene Ressourcen |
|-----------|-----------------|
| **Einfach** | Nur execution-protocol.md |
| **Mittel** | execution-protocol.md + examples.md |
| **Komplex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

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
./apps/api      → Backend-Agent-Workspace
./apps/web      → Frontend-Agent-Workspace
./apps/mobile   → Mobile-Agent-Workspace
```

Workspaces werden mit dem `-w`-Flag beim Starten von Agenten angegeben:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Orchestrierungs-Ablauf

Beim Ausführen eines Multi-Agenten-Workflows (`/orchestrate` oder `/coordinate`):

1. **PM-Agent** zerlegt die Anfrage in domänenspezifische Aufgaben mit Prioritäten (P0, P1, P2) und Abhängigkeiten
2. **Sitzung initialisiert** — Sitzungs-ID generiert, `orchestrator-session.md` und `task-board.md` im Memory erstellt
3. **P0-Aufgaben** werden parallel gestartet (bis zu MAX_PARALLEL gleichzeitige Agenten)
4. **Fortschritt überwacht** — Orchestrator fragt `progress-{agent}.md`-Dateien alle POLL_INTERVAL ab
5. **P1-Aufgaben** werden nach Abschluss von P0 gestartet, und so weiter
6. **Verifikationsschleife** läuft für jeden abgeschlossenen Agenten (Selbst-Review -> automatische Verifikation -> Gegen-Review durch QA)
7. **Ergebnisse gesammelt** aus allen `result-{agent}.md`-Dateien
8. **Abschlussbericht** mit Sitzungszusammenfassung, geänderten Dateien, verbleibenden Problemen

---

## Agenten-Definitionen

Agenten werden an zwei Stellen definiert:

**`.agents/agents/`** — Enthält 7 Subagenten-Definitionsdateien:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Diese Dateien definieren die Identität des Agenten, Verweis auf das Ausführungsprotokoll, CHARTER_CHECK-Vorlage, Architekturzusammenfassung und Regeln. Sie werden beim Starten von Subagenten über das Task/Agent-Tool (Claude Code) oder die CLI verwendet.

**`.claude/agents/`** — IDE-spezifische Subagenten-Definitionen, die über Symlinks oder direkte Kopien auf die `.agents/agents/`-Dateien verweisen, für Claude-Code-Kompatibilität.

---

## Laufzeitzustand (Serena Memory)

Während Orchestrierungssitzungen koordinieren sich Agenten über gemeinsame Memory-Dateien in `.serena/memories/` (konfigurierbar über `mcp.json`):

| Datei | Eigentümer | Zweck | Andere |
|------|-------|---------|--------|
| `orchestrator-session.md` | Orchestrator | Sitzungs-ID, Status, Startzeit, Phasenverfolgung | Nur lesend |
| `task-board.md` | Orchestrator | Aufgabenzuweisungen, Prioritäten, Statusaktualisierungen | Nur lesend |
| `progress-{agent}.md` | Jeweiliger Agent | Zugweiser Fortschritt: durchgeführte Aktionen, gelesene/modifizierte Dateien, aktueller Status | Orchestrator liest |
| `result-{agent}.md` | Jeweiliger Agent | Endergebnis: Status (abgeschlossen/fehlgeschlagen), Zusammenfassung, geänderte Dateien, Akzeptanzkriterien-Checkliste | Orchestrator liest |
| `session-metrics.md` | Orchestrator | Clarification-Debt-Verfolgung, Qualitätsbewertungsentwicklung | QA liest |
| `experiment-ledger.md` | Orchestrator/QA | Experimentverfolgung bei aktiver Qualitätsbewertung | Alle lesen |

Memory-Tools sind konfigurierbar. Standard ist Serena MCP (`read_memory`, `write_memory`, `edit_memory`), aber benutzerdefinierte Tools können in `mcp.json` konfiguriert werden:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Dashboards (`oma dashboard` und `oma dashboard:web`) überwachen diese Memory-Dateien für Echtzeit-Monitoring.
