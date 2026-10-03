---
title: Nutzungsanleitung
sidebar_label: Verwendung
description: "Nutzungsanleitung für OMA mit aufgabenorientierter Auswahl, Einzel-Skill- und Multi-Domain-Beispielen, Workflows, Auto-Erkennung, allen 33 Skill-Paketen, paralleler CLI-Ausführung, Dashboards, Defaults und Wiederherstellung."
---

# So verwendest du oh-my-agent

## Schnellstart

1. Öffne dein Projekt in einer ausgewählten KI-IDE oder CLI (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen oder einem anderen unterstützten Host).
2. Der ausgewählte Host kann Skills aus `.agents/skills/` laden; aktivierte Hooks können Workflows über natürlichsprachliche Keywords erkennen.
3. Beschreibe in natürlicher Sprache, was du brauchst. Der Host oder der ausgewählte Workflow routet die Aufgabe an den passenden Skill.
4. Für Multi-Agenten-Arbeit verwende `/work` oder `/orchestrate`.

Aufgaben in einer einzelnen Domäne brauchen keine besondere Syntax. Nutze die [Auswahlhilfe für Skills und Workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow), um zwischen einem einzelnen Skill, `/work`, `/orchestrate`, `/ultrawork` und `/ralph` zu wählen. Siehe [Schnellstart](../getting-started/quick-start.md) für die Einrichtung und [Wichtige Defaults](../getting-started/important-defaults.md), bevor du Anbieter änderst.

---

## Beispiel 1: einfache Einzelaufgabe

**Du gibst ein:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Was passiert:**

1. Der Host routet die Anfrage an `oma-frontend` (Keywords wie „form“, „component“ und „Tailwind CSS“ dienen als Routing-Signale).
2. Schicht 1 (`SKILL.md`) ist bereits mit Agentenidentität, Kernregeln und Bibliotheksliste geladen.
3. Ressourcen der Schicht 2 werden bei Bedarf geladen:
   - `execution-protocol.md`: der 4-Schritte-Workflow (Analysieren, Planen, Implementieren, Verifizieren)
   - `snippets.md`: Formular- und Zod-Validierungsmuster
   - vorhandene Komponenten-Muster und `snippets.md`, wenn der Skill sie bereitstellt
4. Der Agent gibt einen **CHARTER_CHECK** aus:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. Der Agent implementiert:
   - eine React-Komponente mit TypeScript in `src/features/auth/components/login-form.tsx`
   - ein Zod-Validierungsschema in `src/features/auth/utils/login-validation.ts`
   - Vitest-Tests in `src/features/auth/utils/__tests__/login-validation.test.ts`
   - ein Lade-Skeleton in `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. Der Agent führt die Checkliste aus: Barrierefreiheit (ARIA-Labels, semantisches HTML, Tastaturnavigation), mobiler Viewport, Performance (kein CLS), Error Boundaries.

**Erwartetes Ergebnis:** Eine abgegrenzte React-Komponente mit TypeScript, Validierung, Tests und Nachweisen zur Barrierefreiheit, sofern das Projekt diese Prüfungen unterstützt. Prompt und ausgewählter Workflow bestimmen, welche Dateien und Prüfungen tatsächlich ausgeführt werden.

---

## Beispiel 2: Multi-Domain-Projekt

**Du gibst ein:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Was passiert:**

1. Die Anfrage umfasst Frontend-, Backend- und Mobile-Arbeit. Der Host-Agent kann anhand dieses Umfangs einen Koordinationsansatz empfehlen.
2. Wenn der Keyword-Erkennungs-Hook aktiviert ist, passt „Build a TODO app“ zu einem konfigurierten `/orchestrate`-Muster und kann den Workflow aktivieren. Der Hook gleicht Text ab; er klassifiziert nicht die Anzahl der Domänen. Wähle den gewünschten Workflow mit einem ausdrücklichen Befehl.

**`/work` verwenden (schrittweise mit Benutzersteuerung):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Schritt 1, PM-Agent plant:**
   - identifiziert Domänen: Backend (Auth-API, Task-CRUD), Frontend (Login, Task-Liste), Mobile (Flutter-App)
   - definiert API-Verträge: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - erstellt eine priorisierte Aufgabenaufschlüsselung:
     - P0: Backend-Auth-API, Backend-Task-CRUD-API
     - P1: Frontend-Login/Registrierung, Frontend-Task-Liste, Mobile-Auth-Screens, Mobile-Task-Liste
     - P2: QA-Review
   - speichert nach `.agents/results/plan-{sessionId}.json`

4. **Schritt 2, Plan prüfen:** Der Agent stellt den Plan vor und fährt im Rahmen der bestehenden Autorisierung fort. Er fragt nur nach einer wesentlichen fehlenden Entscheidung oder einer neuen Autorisierung.

5. **Schritt 3, Agenten nach Priorität starten:**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Schritt 4, QA-Agent prüft:**
   - Sicherheit: OWASP-Top-10-Konformität (JWT-Validierung, CSRF, SQL-Injection-Prüfung)
   - Performance: N+1-Abfragen und Pagination prüfen
   - Barrierefreiheit: WCAG 2.1 AA für alle Frontend-Komponenten
   - Domänenübergreifend: API-Verträge zwischen Frontend, Mobile und Backend abgleichen

7. **Schritt 5, iterieren:** Wenn QA CRITICAL-Probleme findet, den zuständigen Agenten mit dem QA-Bericht erneut starten.

---

## Beispiel 3: Bugfixing

**Du gibst ein:**
```
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Was passiert:**

1. `oma-debug` wird automatisch aktiviert (Keywords: „bug“, „error“, „Cannot read property“).
2. **Schritt 1, sammeln:** Fehlermeldung und Kontext werden erfasst.
<!-- oma-docs:ignore-start -->
3. **Schritt 2, reproduzieren:** MCP `search_for_pattern` findet den `.map()`-Aufruf in `src/features/tasks/components/task-list.tsx`.
<!-- oma-docs:ignore-end -->
4. **Schritt 3, diagnostizieren:** MCP `find_referencing_symbols` verfolgt den Datenfluss:
   - Der `useQuery`-Hook lädt Aufgaben aus der API.
   - Die Komponente rendert, bevor die Daten eintreffen.
   - `tasks` ist während des Ladezustands `undefined`.
   - Grundursache: Prüfung des Ladezustands vor `.map()` fehlt.
5. **Schritt 4, Korrektur vorschlagen:** Eine minimale Änderung mit Ladezustandsprüfung und Null-Guard vorlegen.
6. **Schritt 5, implementieren:**
   - Lade-Skeleton ergänzen, während Daten abgerufen werden.
   - Nullprüfung ergänzen: `tasks?.map()` oder bei Ladezustand früh zurückkehren.
   - Regressionstest schreiben, der korrektes Rendern bei `tasks` gleich `undefined` prüft.
7. **Schritt 6, ähnliche Muster scannen:** Mit `search_for_pattern` nach weiteren `.map()`-Aufrufen auf potenziell undefinierten Arrays suchen.
   - Drei ähnliche Muster in `user-list.tsx`, `comment-list.tsx` und `notification-list.tsx` finden.
   - Dasselbe Korrekturmuster gezielt anwenden.
8. **Schritt 7, dokumentieren:** Bug-Bericht mit Grundursache, Korrektur und Vorbeugung im Memory speichern.

---

## Beispiel 4: Design-System

**Du gibst ein:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**Was passiert:**

1. `oma-design` wird aktiviert (Keywords: „design“, „landing page“, „dark“, „premium“).
2. **Phase 1, SETUP:** Prüft `.design-context.md`. Fehlt die Datei, fragt der Agent:
   - Welche Sprachen unterstützt der Dienst? (nur en / zusätzlich CJK)
   - Welche Zielgruppe? (B2B, technische Nutzer, 25–45)
   - Welche Markenpersönlichkeit? (professionell / hochwertig)
   - Welche ästhetische Richtung? (dunkel, hochwertig)
   - Referenzseiten? (Beispiele des Benutzers)
   - Barrierefreiheit? (WCAG AA)
3. **Phase 3, ENHANCE:** Einen ungenauen Prompt in eine Spezifikation nach Abschnitten überführen.
4. **Phase 4, PROPOSE:** Drei Designrichtungen vorstellen:
   - **Richtung A: „Midnight Observatory“**: Tiefes Navy (#0f1729), cyanfarbene Akzente (#22d3ee), Inter + JetBrains Mono, Bento-Raster, scrollgesteuerte Einblendungen
   - **Richtung B: „Carbon Interface“**: Neutrales Grau (#18181b), bernsteinfarbene Akzente (#f59e0b), Systemschriften, Schachbrettlayout, Hover-Mikrointeraktionen
   - **Richtung C: „Deep Space“**: Reines Dunkel (#0a0a0a), smaragdgrüne Akzente (#10b981), Geist + Geist Mono, vollflächige Abschnitte, Eintrittsanimationen
5. **Phase 5, GENERATE:** Auf Basis der gewählten Richtung erzeugen:
   - `DESIGN.md` mit 6 Abschnitten (Typografie, Farbe, Abstand, Bewegung, Komponenten, Barrierefreiheit)
   - CSS-Custom-Properties
   - Erweiterungen für die Tailwind-Konfiguration
   - shadcn/ui-Theme-Variablen
6. **Phase 6, AUDIT:** Responsive-Verhalten (mindestens 320px), WCAG 2.2, Nielsen-Heuristiken und KI-Kitsch prüfen.
7. **Phase 7, HANDOFF:** „Design abgeschlossen. `/orchestrate` für die Implementierung mit oma-frontend ausführen.“

---

## Beispiel 5: parallele CLI-Ausführung

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Wenn die aktuelle Laufzeit dem Ziel-Vendor in `.agents/oma-config.yaml` entspricht, sollten Workflows native Subagenten bevorzugen:

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, ausgewählt über den `subagent_type` des Agent-Tools
- Antigravity CLI/IDE -> `oma agent spawn` über `agy`

Cross-Vendor-Aufgaben und `model_preset: free` verwenden `oma agent spawn`. Der native Dispatch erfordert weiterhin den [Ergebnis-Lebenszyklus](./agent-results-and-resume.md), um Verifizierungsbelege zu erfassen.

---

## Beispiel 6: ultrawork für maximale Qualität

**Du gibst ein:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**Was passiert (5 Phasen, 17 Schritte, 12 isolierte Review-Schritte):**

**Phase 1, PLAN (Schritte 1–4, PM-Agent inline):**
- Schritt 1: Plan mit Aufgabenzerlegung, API-Verträgen und Abhängigkeiten erstellen
- Schritt 2: Plan-Review (Vollständigkeitsprüfung; sind alle Anforderungen abgebildet?)
- Schritt 3: Meta-Review (prüfen, ob das Review ausreichte)
- Schritt 4: Over-Engineering-Review (MVP-Fokus, keine unnötige Komplexität)
- PLAN_GATE: Plan dokumentiert, Annahmen aufgelistet, Umfang autorisiert

**Phase 2, IMPL (Schritt 5, Dev-Agenten gestartet):**
- Backend-Agent implementiert Stripe-Integration (Webhooks, Idempotenz, Fehlerbehandlung)
- Frontend-Agent erstellt Checkout-Flow und UI für den Zahlungsstatus
- Schritt 5.2: Eine Baseline nur aufzeichnen, wenn ein definierter Messvergleich erforderlich ist
- IMPL_GATE: Anwendbare Prüfungen ohne Dateiausgabe und Tests bestehen, nur geplante Dateien geändert; Build-Prüfungen nur auf ausdrücklichen Wunsch

**Phase 3, VERIFY (Schritte 6–8, QA-Agent gestartet):**
- Schritt 6: Alignment-Review (entspricht die Implementierung dem Plan?)
- Schritt 7: Sicherheits-/Bug-Review (OWASP, npm audit, Stripe-Sicherheitspraktiken)
- Schritt 8: Verbesserungs-/Regression-Review (keine Regressionen)
- VERIFY_GATE: null CRITICAL, null HIGH, anwendbare Messziele des Projekts erreicht

**Phase 4, REFINE (Schritte 9–13, Refactor-Agent gestartet):**
- Schritt 9: Große Dateien (> 500 Zeilen) und Funktionen (> 50 Zeilen) aufteilen
- Schritt 10: Integrations-/Wiederverwendungs-Review (doppelte Logik entfernen)
- Schritt 11: Seiteneffekt-Review (Kaskadenauswirkung mit `find_referencing_symbols` verfolgen)
- Schritt 12: Vollständiges Änderungs-Review (Namenskonsistenz, Stilabgleich)
- Schritt 13: Toten Code bereinigen
- REFINE_GATE: keine ungelöste gemessene Regression, Code bereinigt

**Phase 5, SHIP (Schritte 14–17, QA-Agent gestartet):**
- Schritt 14: Code-Qualitäts-Review (Lint, Typen, Abdeckung)
- Schritt 15: UX-Flow-Verifikation (End-to-End-Zahlungsablauf)
- Schritt 16: Review verwandter Probleme (abschließende Kaskadenprüfung)
- Schritt 17: Deployment-Bereitschaft (Secrets-Management, Migrationen, Rollback-Plan)
- SHIP_GATE: Alle Prüfungen bestehen; bestehende Autorisierung nutzen. Veröffentlichung oder Deployment erfordert eine Autorisierung für diese Aktion.

---

## Alle Workflow-Befehle

| Befehl | Typ | Zweck | Wann verwenden |
|---------|------|-------------|-------------|
| `/orchestrate` | Persistent | Plan laden oder erstellen und parallele Ausführung mit Überwachung und Verifikation delegieren | Unabhängige Aufgaben für automatisierte Koordination |
| `/work` | Persistent | Schrittweise Multi-Domain-Planung, Implementierung und QA im autorisierten Umfang | Features über mehrere Domänen mit Koordinationsbedarf |
| `/ultrawork` | Persistent | Qualitätsworkflow mit 5 Phasen, 17 Schritten und 12 isolierten Review-Prüfpunkten | Maximale Qualität bei produktionskritischem Code |
| `/plan` | Nicht-persistent | PM-gesteuerte Aufgabenzerlegung, API-Verträge und nachverfolgte Plan-Artefakte in `docs/plans/work/` (fortlaufendes `NNN-name.md`, Feld `Status`) | Vor komplexer Multi-Agenten-Arbeit oder bei benötigten Entscheidungsprotokollen |
| `/brainstorm` | Nicht-persistent | Design-first-Ideenfindung mit 2–3 Ansätzen | Vor der Festlegung auf einen Implementierungsansatz |
| `/deepinit` | Nicht-persistent | Vollständige Projektinitialisierung (AGENTS.md, ARCHITECTURE.md, docs/) | Einrichtung von oh-my-agent in einer bestehenden Codebasis |
| `/review` | Nicht-persistent | QA-Pipeline: OWASP-Sicherheit, Performance, Barrierefreiheit und Codequalität | Vor Merge oder Deployment |
| `/debug` | Nicht-persistent | Strukturiertes Debugging: reproduzieren, diagnostizieren, korrigieren, Regressionstest, Scan | Untersuchung von Bugs und Fehlern |
| `/design` | Nicht-persistent | 7-Phasen-Designworkflow mit DESIGN.md und Tokens | Aufbau von Design-Systemen, Landingpages oder UI-Redesigns |
| `/scm` | Nicht-persistent | SCM für Git (Branch/Merge/Konflikt/Worktree/Baseline) plus Conventional-Commit-Erzeugung mit Typ-/Scope-Erkennung und Feature-Aufteilung | Nach Codeänderungen oder bei Repository-Konfigurationsaufgaben |
| `/tools` | Nicht-persistent | Sichtbarkeit von MCP-Tools verwalten (Gruppen aktivieren/deaktivieren) | Festlegen, welche MCP-Tools Agenten verwenden dürfen |
| `/stack-set` | Nicht-persistent | Tech-Stack erkennen und Backend- oder Mobile-Referenzen (Swift/Flutter/RN) erzeugen | Sprachspezifische Coding-Konventionen einrichten |
| `/architecture` | Nicht-persistent | Architektur diagnostizieren, Optionen vergleichen und Entscheidungsprotokolle erstellen | Grenzen prüfen oder Architektur wählen |
| `/convert` | Nicht-persistent | Dokumentkonvertierung an den passenden Skill routen | HWP/HWPX- oder PDF-Quelldateien konvertieren |
| `/docs` | Nicht-persistent | Dokumentation verifizieren und diffbezogene Sync-Vorschläge erstellen | Docs gegen die aktuelle Codebasis prüfen |
| `/explain` | Nicht-persistent | Offline-HTML-Erklärer für Codeänderungen erzeugen und validieren | Diff, PR, Branch oder Commit-Bereich erklären |
| `/recap` | Nicht-persistent | Arbeit über unterstützte KI-Tool-Historien zusammenfassen | Tages- oder Zeitraum-Retrospektiven |
| `/schedule` | Nicht-persistent | Wiederkehrende Agentenjobs registrieren | Nächtliche Recaps, Scans oder Wartung |
| `/video` | Nicht-persistent | Reproduzierbare Videos aus Skripten, Narration und Visuals erstellen | Shorts, Erklär- und Demo-Videos |
| `/ralph` | Persistent | Ultrawork mit unabhängigem Judge und Schleifenschutz wiederholen | Ausdrücklicher Auftrag, bis zu mechanisch prüfbaren Kriterien zu wiederholen |

---

## Beispiele für Auto-Erkennung

oh-my-agent erkennt Workflow-Keywords in 11 Sprachen. Diese Beispiele zeigen, wie natürliche Sprache Workflows auslöst:

| Eingabe | Erkannter Workflow | Sprache |
|----------|------------------|----------|
| "plan the authentication feature" | `/plan` | Englisch |
| "do everything in parallel" | `/orchestrate` | Englisch |
| "review the code for security" | `/review` | Englisch |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | Englisch |
| "design a landing page for our product" | `/design` | Englisch |
| "fix the login bug" | `/debug` | Englisch |
| "계획 세워줘" | `/plan` | Koreanisch |
| "버그 수정해줘" | `/debug` | Koreanisch |
| "디자인 시스템 만들어줘" | `/design` | Koreanisch |
| "자동으로 실행해" | `/orchestrate` | Koreanisch |
| "コードレビューして" | `/review` | Japanisch |
| "計画を立てて" | `/plan` | Japanisch |
| "修复这个 bug" | `/debug` | Chinesisch |
| "设计一个着陆页" | `/design` | Chinesisch |
| "revisar código" | `/review` | Spanisch |
| "diseña la página" | `/design` | Spanisch |
| "debuggen" | `/debug` | Deutsch |
| "coordonner étape par étape" | `/work` | Französisch |
| "don't stop until it's done" | `/ralph` | Englisch |
| "끝까지 해" | `/ralph` | Koreanisch |
| "最後までやって" | `/ralph` | Japanisch |

**Informationelle Fragen werden herausgefiltert:**

| Eingabe | Ergebnis |
|----------|--------|
| "what is orchestrate?" | Kein Workflow (Informationsmuster: "what is") |
| "explain how /plan works" | Kein Workflow (Informationsmuster: "explain") |
| "어떻게 사용해?" | Kein Workflow (Informationsmuster: "어떻게") |
| "レビューとは何ですか" | Kein Workflow (Informationsmuster: "とは") |

---

## Alle 33 Skills: Kurzreferenz

Das `all`-Preset des Installers folgt der Live-Registry. Die Tabelle gruppiert alle aktuellen Skills nach ihrem Hauptzweck; an einer Grenze kann ein Skill weiterhin mit einem anderen zusammenarbeiten.

| Skill | Besonders geeignet für | Primäre Ausgabe |
|-------|---------|---------------|
| **oma-academic-writing** | Akademisches Schreiben, Überarbeiten und Anti-KI-Review | Publikationsorientierte Prosa sowie Überarbeitungen von Claims und Belegen |
| **oma-architecture** | Systemgrenzen, Trade-offs, ADRs | Architekturempfehlung oder Entscheidungsprotokoll |
| **oma-backend** | APIs, Auth, Serverlogik, Migrationen | Router-/Service-/Repository-Änderungen und Verifikation |
| **oma-brainstorm** | Unklare Ideen und Ansatzvergleich | Designdokument in `docs/plans/designs/` |
| **oma-coordination** | Manuelle Multi-Agenten-Koordination | Schrittweise Aufgaben- und Übergabeanleitung |
| **oma-db** | Schemaentwurf, ERD, Query-Tuning, Kapazitätsplanung | Schemadokumentation, Migrationen und Wiederherstellungsplan |
| **oma-debug** | Bug-Reproduktion und Grundursachenanalyse | Minimale Korrektur, Regressionsevidenz und Musterscan |
| **oma-deepsec** | Agentenbasiertes Schwachstellen-Scanning | Scan-, Triage-, Revalidierungs- und Gate-Berichte |
| **oma-design** | Design-Systeme, Landingpages, Tokens | `DESIGN.md`, Tokens und Komponentenleitfaden |
| **oma-dev-workflow** | CI/CD, Monorepos, Migrationen, Release-Automatisierung | Workflow-Konfiguration und Release-Prüfungen |
| **oma-docs** | Defekte Referenzen und Dokumentations-Drift | Verify-Bericht oder diffbezogene Sync-Kandidaten |
| **oma-explanation** | Walkthroughs von Diff, PR, Branch oder Commit | Offline-HTML-Erklärer mit Background, Intuition, Code und Quiz |
| **oma-frontend** | UI-Komponenten, Formulare, Seiten, Angular- oder React-Styling | Frontend-Änderungen und passende Prüfungen |
| **oma-hwp** | HWP-/HWPX-/HWPML-Konvertierung | Markdown mit Überschriften, Tabellen, Bildern und Links |
| **oma-image** | Bildgenerierung und visuelle Assets | Reproduzierbarer Bildlauf mit Manifest |
| **oma-market** | Pain Points, Trends, Wettbewerbs- und Discovery-Forschung | LAW-konformer Research-Brief mit Frameworks |
| **oma-mobile** | Flutter, React Native und native Swift-iOS-Arbeit | Mobile Screens, State, Plattformintegration und Tests |
| **oma-observability** | Traces, Metriken, Logs, Profile, SLOs, Incident-Forensik | Schichtenbezogene Observability-Empfehlung oder Implementierungsleitfaden |
| **oma-orchestration** | Automatisierte parallele Agentenausführung | Koordinierte Pläne, Memory-Updates und Ergebnissammlung |
| **oma-pdf** | PDF-Konvertierung und OCR-bewusste Extraktion | Markdown mit Lesereihenfolge, Tabellen, Listen und Bildern |
| **oma-pm** | Anforderungen, Aufgabenzerlegung, API-Verträge | `.agents/results/plan-{sessionId}.json` und Task Board |
| **oma-qa** | Sicherheits-, Performance-, Barrierefreiheits- und Qualitätsreview | Befundbericht mit Schweregrad und Behebungsevidenz |
| **oma-recap** | Toolübergreifende Arbeitsretrospektiven | Tages- oder Zeitraum-Recap in `.agents/results/recap/` |
| **oma-refactor** | Verhaltensbewahrendes Umstrukturieren | Refactor-Änderungen mit Charakterisierung und Qualitätsevidenz |
| **oma-scholar** | Wissenschaftliche Suche und Paper-Sidecars | Validierte `.knows.yaml`-Sidecar-Operationen |
| **oma-scm** | Git-Branches, Worktrees, Baselines und Commit-Hygiene | SCM-Plan oder Conventional-Commit-Ausgabe |
| **oma-search** | Vertrauensbewertete Dokument-, Web-, Code- und lokale Suche | Geroutete Suchergebnisse mit Vertrauenslabels |
| **oma-skill-creation** | OMA-Skills erstellen und auditieren | SSL-lite-Skill-Dateien und `oma skill audit`-Ergebnisse |
| **oma-slide** | HTML-Präsentationen und Exporte | Validiertes gebündeltes HTML, PDF, PNG oder PPTX |
| **oma-tf-infra** | Terraform-Infrastruktur, IAM und Policy-as-Code | Terraform-Module, Pläne und Kontrollen |
| **oma-translation** | UI-, Dokumentations- und Marketing-Lokalisierung | Kontextwahrender übersetzter Inhalt |
| **oma-video** | Shorts, Erklär- und Demo-Videos | Reproduzierbarer Videolauf mit Assets und Manifest |
| **oma-voice** | Lokales TTS, STT und Voiceovers | Audio- oder Transkriptionsartefakte mit Manifest |

---

## Dashboard einrichten

### Terminal-Dashboard

```bash
oma dashboard terminal
```

Zeigt eine Live-Tabelle im Terminal:
- Sitzungs-ID und Gesamtstatus (RUNNING / COMPLETED / FAILED)
- Zeilen pro Agent: Status, Zugzahl, letzte Aktivität, verstrichene Zeit
- Überwacht `.agents/state/memories/` für Echtzeit-Fortschritt

### Web-Dashboard

```bash
oma dashboard web
# Opens http://localhost:9847
```

Funktionen:
- Echtzeit-Updates über WebSocket ohne manuelle Aktualisierung
- Automatische Wiederverbindung bei Verbindungsabbrüchen
- Sitzungsstatus mit farbcodierten Agentenindikatoren (grün=abgeschlossen, gelb=laufend, rot=fehlgeschlagen)
- Aktivitätsprotokoll aus Fortschritts- und Ergebnisdateien
- Historische Sitzungsdaten

### Empfohlenes Layout

Verwende 3 Terminals:
1. **Dashboard-Terminal:** `oma dashboard terminal` für kontinuierliche Überwachung
2. **Befehlsterminal:** Agenten-Spawn- und Workflow-Befehle
3. **Build-Terminal:** Testläufe, Build-Logs und Git-Operationen

---

## Schlüsselkonzepte erklärt

### Progressive Offenlegung

Skills werden in zwei Schichten geladen, um Tokens zu sparen. Schicht 1 (`SKILL.md`, im aktuellen 33-Skill-Baum im Median etwa 2.631 Tokens) gelangt in den Kontext, wenn der Host den Skill routet; der Injector übergibt einen Pfad, nicht den Inhalt. Schicht 2 (`resources/`) wird gemäß den Schwierigkeitsstufen nur nach Bedarf gelesen. In einer Sitzung mit 5 Agenten umfasst der Skill-Kontext bei Simple oder Medium etwa 18–19K Tokens gegenüber einer Obergrenze von 73K; damit bleiben in einem 128K-Kontext ungefähr 109K für die eigentliche Arbeit frei. Complex umfasst etwa 39K und lässt ungefähr 89K frei. Siehe [Token-Einsparungsberechnung](../core-concepts/skills.md#token-savings-math) für Tabelle und Messskript.

### Token-Optimierung

Zusätzlich zur progressiven Offenlegung spart oh-my-agent Tokens durch:
- **Kontextbudgetverwaltung:** keine vollständigen Dateilesungen; `find_symbol` statt `read_file` verwenden
- **Lazily geladene Ressourcen:** Fehler-Playbooks erst bei Fehlern, Checklisten erst bei der Verifikation laden
- **Schwierigkeitsabhängige Verzweigung:** Simple-Aufgaben überspringen die Analyse und nutzen minimale Checklisten
- **Fortschrittsverfolgung:** Agenten halten gelesene Dateien fest, um erneute Lektüre zu vermeiden

### CLI-Spawning

Bei `oma agent spawn` führt die CLI aus:
1. Vendor der Rolle aus expliziten Optionen, Agenten-Overrides, Model-Preset und konfiguriertem Fallback auflösen
2. Vendor-spezifisches Ausführungsprotokoll aus `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` injizieren
3. Agenten-Prompt aus SKILL.md-Kernregeln, Ausführungsprotokoll und aufgabenrelevanten Ressourcen zusammensetzen
4. Agenten als unabhängigen CLI-Prozess starten
5. Einen strukturierten Ausführungsbeleg (Receipt) unter `.agents/state/agent-runs/` aufzeichnen und einen Pfad zur Ergebnisdeklaration (Claim) injizieren
6. Der Agent schreibt eine strukturierte Ergebnisdeklaration (Claim); lesbare Fortschritts- und Ergebnis-Markdown-Dateien sind ergänzend

### Projekt-Memory-Speicher

Agenten koordinieren über dauerhafte Dateien in `.agents/state/memories/` (ältere Projekte fallen auf `.serena/memories/` zurück). Der Orchestrator schreibt sitzungs- und taskbezogene Dateien pro Lauf. Jeder Lauf schreibt `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` und `result-{agentId}-{taskId}-{runId}-{sessionId}.md`, wenn Markdown-Fortschritt oder -Ergebnis aktiviert ist; strukturierte Ausführungsbelege (Receipts) und Ergebnisdeklarationen (Claims) unter `.agents/state/agent-runs/` sind für CLI-Spawns maßgeblich. Agenten lesen und schreiben diese Dateien mit ihren nativen Dateitools; die Tool-Zuordnung bleibt in `.agents/mcp.json → memoryConfig.tools` konfigurierbar.

### Workspaces

<!-- oma-docs:ignore-start -->
Das `-w`-Flag von `agent spawn` isoliert einen Agenten in einem bestimmten Verzeichnis. Das ist für parallele Ausführung entscheidend. Ohne Workspace-Isolation könnten zwei Agenten gleichzeitig dieselbe Datei ändern und Konflikte erzeugen. Standardlayout: `./apps/api` (Backend), `./apps/web` (Frontend), `./apps/mobile` (Mobile).
<!-- oma-docs:ignore-end -->

---

## Tipps

1. **Prompts konkret formulieren.** „Baue eine TODO-App mit JWT-Auth, React-Frontend, Express-Backend und PostgreSQL“ liefert bessere Ergebnisse als „Mach eine App“.

2. **Workspaces für parallele Agenten verwenden.** Immer `-w ./path` übergeben, damit gleichzeitig laufende Agenten keine Dateikonflikte erzeugen.

3. **API-Verträge vor dem Start von Implementierungsagenten festlegen.** Zuerst `/plan` ausführen, damit Frontend- und Backend-Agenten dieselben Endpunktformen verwenden.

4. **Aktiv überwachen.** Ein Dashboard-Terminal öffnen, damit fehlschlagende Agenten früh auffallen.

5. **Mit Re-Spawns iterieren.** Ist die Ausgabe eines Agenten nicht passend, ihn mit ursprünglicher Aufgabe und Korrekturkontext erneut starten. Nicht von vorn beginnen.

6. **Koordination an die Aufgabe anpassen.** Für eine Domäne mit einem einzelnen Skill beginnen; bei Koordinationsbedarf oder einem ausdrücklichen Qualitätsprozess die [Auswahlhilfe](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) verwenden.

7. **Bei unklaren Ideen `/brainstorm` vor `/plan` verwenden.** Brainstorm klärt Absicht und Ansatz, bevor der PM-Agent Aufgaben zerlegt.

8. **Bei neuen Codebasen `/deepinit` ausführen.** Dadurch entstehen AGENTS.md und ARCHITECTURE.md, die allen Agenten die Projektstruktur erklären.

9. **`model_preset` konfigurieren.** Mit `auto` beginnen, ein festes Preset wie `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` oder `mixed` wählen oder `free` mit lokalem Gateway verwenden. Für feingranulare Steuerung `agents:`-Overrides ergänzen. Siehe [Modelle pro Agent](./per-agent-models.md).

10. **`/ultrawork` verwenden, wenn der vollständige Review-Prozess ausdrücklich gewünscht ist.** Der 5-Phasen-Workflow führt 12 isolierte Review-Schritte aus; das Laden eines Skills löst diese Prüfungen allein nicht aus.

---

## Fehlerbehebung

| Problem | Ursache | Lösung |
|---------|-------|-----|
| Skills in der IDE nicht erkannt | `.agents/skills/` fehlt oder enthält keine `SKILL.md`-Dateien | Installer ausführen (`bunx oh-my-agent@latest`), Symlinks in `.claude/skills/` prüfen und IDE neu starten |
| CLI beim Spawning nicht gefunden | Ausgewählte KI-CLI nicht installiert oder nicht im `PATH` | `which <selected-cli>` ausführen (z. B. `claude`, `codex`, `agy`, `qwen` oder `kiro`), neue Shell öffnen oder Installationsanleitung befolgen |
| Agenten erzeugen widersprüchlichen Code | Keine Workspace-Isolation | Separate Workspaces verwenden: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard zeigt „No agents detected“ | Agenten haben noch nicht ins Memory geschrieben | Start der Agenten abwarten (erster Write in Zug 1) oder prüfen, ob die Sitzungs-ID stimmt |
| Web-Dashboard startet nicht | Abhängigkeiten fehlen | Zuerst `bun install` im Verzeichnis `web/` ausführen |
| QA-Bericht enthält mehr als 50 Befunde | Für das erste Review einer großen Codebasis normal | Zuerst CRITICAL und HIGH bearbeiten; MEDIUM/LOW für spätere Sprints dokumentieren |
| Auto-Erkennung aktiviert falschen Workflow | Mehrdeutiges Keyword | Explizites `/command` statt natürlicher Sprache verwenden und Fehltrigger melden |
| Persistenter Workflow stoppt nicht | Zustandsdatei existiert noch | Im Chat „workflow done“ sagen oder Zustandsdatei manuell aus `.agents/state/` löschen |
| Agent bei HIGH-Klärung blockiert | Anforderungen zu unklar | Angeforderte Antworten geben und anschließend erneut ausführen |
| MCP-Tools funktionieren nicht | Serena nicht konfiguriert oder nicht gestartet | `oma doctor` zur Prüfung der MCP-Konfiguration ausführen |
| Agent überschreitet Ausführungsbudget | Aufgabe zu komplex für einen Lauf | Aufgabe zerlegen, Workflow mit klaren Grenzen verwenden oder mit engerem Akzeptanzvertrag erneut versuchen |
| Falsche CLI für Agent verwendet | `model_preset` nicht konfiguriert oder Agenten-Override fehlt | `oma install` zur Konfiguration ausführen oder `model_preset` in `oma-config.yaml` setzen. Siehe [Modelle pro Agent](./per-agent-models.md). |

---

Für Muster bei Aufgaben in einer einzelnen Domäne siehe den [Single-Skill-Leitfaden](./single-skill.md).
Für die Integration in bestehende Projekte siehe die [Integrationsanleitung](./integration.md).
