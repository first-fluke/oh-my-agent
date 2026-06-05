---
title: Workflows
description: Vollständige Referenz aller 16 oh-my-agent-Workflows — Slash-Befehle, persistenter vs. nicht-persistenter Modus, Trigger-Keywords in 11 Sprachen, Phasen und Schritte, gelesene und geschriebene Dateien, Auto-Erkennung-Mechanik und Zustandsverwaltung des persistenten Modus.
---

# Workflows

Workflows sind strukturierte mehrstufige Prozesse, die durch Slash-Befehle oder natürlichsprachliche Keywords ausgelöst werden. Sie definieren, wie Agenten bei Aufgaben zusammenarbeiten — von einphasigen Hilfsprogrammen bis hin zu komplexen 5-Phasen-Qualitäts-Gates.

Es gibt 16 Workflows, von denen 4 persistent sind (sie halten den Zustand und können nicht versehentlich unterbrochen werden).

---

## Persistente Workflows

Persistente Workflows laufen weiter, bis alle Aufgaben erledigt sind. Sie halten den Zustand in `.agents/state/` und injizieren bei jeder Benutzernachricht den Kontext `[OMA PERSISTENT MODE: ...]` erneut, bis sie explizit deaktiviert werden.

### /orchestrate

**Beschreibung:** Automatisierte CLI-basierte parallele Agentenausführung. Startet Subagenten über die CLI, koordiniert über MCP-Memory, überwacht den Fortschritt und führt Verifikationsschleifen durch.

**Persistent:** Ja. Zustandsdatei: `.agents/state/orchestrate-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "orchestrate" |
| Englisch | "parallel", "do everything", "run everything" |
| Koreanisch | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japanisch | "オーケストレート", "並列実行", "自動実行" |
| Chinesisch | "编排", "并行执行", "自动执行" |
| Spanisch | "orquestar", "paralelo", "ejecutar todo" |
| Französisch | "orchestrer", "parallèle", "tout exécuter" |
| Deutsch | "orchestrieren", "parallel", "alles ausführen" |
| Portugiesisch | "orquestrar", "paralelo", "executar tudo" |
| Russisch | "оркестровать", "параллельно", "выполнить всё" |
| Niederländisch | "orkestreren", "parallel", "alles uitvoeren" |
| Polnisch | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Trigger-Regex-Muster** (Absicht + Substantiv-Whitelist, siehe [Auto-Erkennung: Pattern-Feld](#pattern-field-raw-regex)):
| Abschnitt | Muster | Beispiele, die auslösen |
|-----------|--------|------------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Substantiv-Whitelist (15): app, api, service, server, cli, tool, website, dashboard, system, feature, backend, frontend, prototype, mvp, bot.

**Schritte:**
1. **Schritt 0 — Vorbereitung:** Koordinations-Skill, Context-Loading-Leitfaden, Memory-Protokoll lesen. Vendor erkennen.
2. **Schritt 1 — Plan laden/erstellen:** Auf `.agents/results/plan-{sessionId}.json` prüfen. Falls nicht vorhanden, Benutzer auffordern, zuerst `/plan` auszuführen.
3. **Schritt 2 — Sitzung initialisieren:** `oma-config.yaml` laden, CLI-Zuordnungstabelle anzeigen, Sitzungs-ID generieren (`session-YYYYMMDD-HHMMSS`), `orchestrator-session.md` und `task-board.md` im Memory erstellen.
4. **Schritt 3 — Agenten starten:** Für jede Prioritätsstufe (P0 zuerst, dann P1...) Agenten mit der vendor-geeigneten Methode starten (Agent-Tool für Claude Code, `oma agent:spawn` für Gemini/Antigravity, modellvermittelt für Codex). MAX_PARALLEL niemals überschreiten.
5. **Schritt 4 — Überwachen:** `progress-{agent}.md`-Dateien abfragen, `task-board.md` aktualisieren. Auf Abschlüsse, Fehler und Abstürze achten.
6. **Schritt 5 — Verifizieren:** `verify.sh {agent-type} {workspace}` pro abgeschlossenem Agenten ausführen. Bei Fehlschlag mit Fehlerkontext erneut starten (max. 2 Wiederholungen). Nach 2 Wiederholungen Explorationsschleife aktivieren: 2-3 Hypothesen generieren, parallele Experimente starten, bewerten, bestes beibehalten.
7. **Schritt 6 — Zusammentragen:** Alle `result-{agent}.md`-Dateien lesen, Zusammenfassung zusammenstellen.
8. **Schritt 7 — Abschlussbericht:** Sitzungszusammenfassung präsentieren. Falls die Qualitätsbewertung gemessen wurde, Experimentprotokoll-Zusammenfassung einbeziehen und automatisch Erkenntnisse generieren.

**Gelesene Dateien:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Geschriebene Dateien:** `orchestrator-session.md`, `task-board.md` (Memory), Abschlussbericht.

**Einsatzbereich:** Große Projekte, die maximale Parallelität mit automatisierter Koordination erfordern.

---

### /work

**Beschreibung:** Schrittweise domänenübergreifende Koordination. PM plant zuerst, dann führen Agenten mit Benutzerbestätigung an jedem Gate aus, gefolgt von QA-Review und Problembehebung.

**Persistent:** Ja. Zustandsdatei: `.agents/state/work-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "work", "step by step" |
| Koreanisch | "코디네이트", "단계별" |
| Japanisch | "コーディネート", "ステップバイステップ" |
| Chinesisch | "协调", "逐步" |
| Spanisch | "coordinar", "paso a paso" |
| Französisch | "coordonner", "étape par étape" |
| Deutsch | "koordinieren", "schritt für schritt" |

**Schritte:**
1. **Schritt 0 — Vorbereitung:** Skills, Context-Loading, Memory-Protokoll lesen. Sitzungsstart aufzeichnen.
2. **Schritt 1 — Anforderungen analysieren:** Beteiligte Domänen identifizieren. Bei einzelner Domäne direkte Agentenverwendung vorschlagen.
3. **Schritt 2 — PM-Agent-Planung:** PM zerlegt Anforderungen, definiert API-Verträge, erstellt priorisierte Aufgabenaufschlüsselung, speichert in `.agents/results/plan-{sessionId}.json`.
4. **Schritt 3 — Plan prüfen:** Plan dem Benutzer präsentieren. **Bestätigung muss vor dem Fortfahren eingeholt werden.**
5. **Schritt 4 — Agenten starten:** Start nach Prioritätsstufe, parallel innerhalb derselben Stufe, separate Workspaces.
6. **Schritt 5 — Überwachen:** Fortschrittsdateien abfragen, API-Vertrags-Übereinstimmung zwischen Agenten verifizieren.
7. **Schritt 6 — QA-Review:** QA-Agenten für Sicherheit (OWASP), Performance, Barrierefreiheit, Code-Qualität starten.
8. **Schritt 6.1 — Qualitätsbewertung** (bedingt): Baseline messen und aufzeichnen.
9. **Schritt 7 — Iterieren:** Bei CRITICAL-/HIGH-Problemen zuständige Agenten erneut starten. Besteht dasselbe Problem nach 2 Versuchen weiter, Explorationsschleife aktivieren.

**Einsatzbereich:** Features, die mehrere Domänen umfassen und schrittweise Kontrolle mit Benutzergenehmigung an jedem Gate erfordern.

---

### /ultrawork

**Beschreibung:** Der qualitätsfokussierte Workflow. 5 Phasen, 17 Schritte insgesamt, davon 11 Review-Schritte. Jede Phase hat ein Gate, das bestanden werden muss, bevor es weitergeht.

**Persistent:** Ja. Zustandsdatei: `.agents/state/ultrawork-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "ultrawork", "ulw" |

**Phasen und Schritte:**

| Phase | Schritte | Agent | Review-Perspektive |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM-Agent (inline) | Vollständigkeit, Meta-Review, Überarbeitung/Einfachheit |
| **IMPL** | 5 | Dev-Agenten (gestartet) | Implementierung |
| **VERIFY** | 6-8 | QA-Agent (gestartet) | Übereinstimmung, Sicherheit (OWASP), Regressionsprävention |
| **REFINE** | 9-13 | Debug-Agent (gestartet) | Dateiaufteilung, Wiederverwendbarkeit, Kaskadenauswirkung, Konsistenz, Toter Code |
| **SHIP** | 14-17 | QA-Agent (gestartet) | Code-Qualität (Lint/Abdeckung), UX-Flow, Verwandte Probleme, Deployment-Bereitschaft |

**Gate-Definitionen:**
- **PLAN_GATE:** Plan dokumentiert, Annahmen aufgelistet, Alternativen berücksichtigt, Überarbeitungs-Review durchgeführt, Benutzerbestätigung.
- **IMPL_GATE:** Build erfolgreich, Tests bestehen, nur geplante Dateien modifiziert, Baseline-Qualitätsbewertung aufgezeichnet (falls gemessen).
- **VERIFY_GATE:** Implementierung entspricht Anforderungen, null CRITICAL, null HIGH, keine Regressionen, Qualitätsbewertung >= 75 (falls gemessen).
- **REFINE_GATE:** Keine großen Dateien/Funktionen (> 500 Zeilen / > 50 Zeilen), Integrationsmöglichkeiten erfasst, Seiteneffekte verifiziert, Code bereinigt, Qualitätsbewertung nicht rückläufig.
- **SHIP_GATE:** Qualitätsprüfungen bestehen, UX verifiziert, verwandte Probleme gelöst, Deployment-Checkliste komplett, abschließende Qualitätsbewertung >= 75 mit nicht-negativem Delta, abschließende Benutzergenehmigung.

**Verhalten bei Gate-Fehlschlag:**
- Erster Fehlschlag: zum relevanten Schritt zurückkehren, beheben und erneut versuchen.
- Zweiter Fehlschlag beim selben Problem: Explorationsschleife aktivieren (2-3 Hypothesen generieren, jede ausprobieren, bewerten, beste beibehalten).

**Bedingte Erweiterungen:** Qualitätsbewertungsmessung, Behalten-/Verwerfen-Entscheidungen, Experimentprotokoll, Hypothesenexploration, Auto-Learning (Erkenntnisse aus verworfenen Experimenten).

**REFINE-Überspringbedingung:** Einfache Aufgaben unter 50 Zeilen.

**Einsatzbereich:** Maximale Lieferqualität. Wenn Code produktionsreif mit umfassendem Review sein muss.

---

### /ralph

**Beschreibung:** Persistente, selbstreferenzielle Ausführungsschleife. Umhüllt ultrawork mit einem unabhängigen Verifier, der die Abschlusskriterien nach jeder Iteration prüft. Läuft weiter, bis alle Kriterien bestehen oder Schutzvorrichtungen auslösen.

**Persistent:** Ja. Zustandsdatei: `.agents/state/ralph-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "ralph" |
| Englisch | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| Koreanisch | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| Japanisch | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinesisch | "不要停", "直到完成", "全部完成", "做完为止" |
| Spanisch | "no pares", "hasta completar", "termina todo" |
| Französisch | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Deutsch | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**Phasen:**
1. **Phase 0 — INIT:** Voraussetzungen laden (Context-Loading, Memory-Protokoll, Judge-Protokoll). Verifizierbare Abschlusskriterien definieren (jedes muss mechanisch überprüfbar sein — Test bestanden, Build erfolgreich, Datei vorhanden). Kriterien zur Bestätigung durch den Benutzer vorlegen. Sitzung mit `max_iterations: 5` initialisieren.
2. **Phase 1 — WORK:** Ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) als eine einzelne Iteration ausführen.
3. **Phase 2 — JUDGE:** Unabhängiger Verifier prüft jedes Abschlusskriterium gegen den tatsächlichen Projektzustand (Tests ausführen, Builds prüfen, Existenz von Dateien verifizieren). Jedes Kriterium als PASS/FAIL mit Nachweis bewerten.
4. **Phase 3 — DECIDE:** Wenn alle Kriterien PASS → Schleife beenden, Abschlussbericht generieren. Bei FAIL → Iterationszähler erhöhen, Fehlerkontext zurückführen, zurück zu Phase 1.
5. **Schutzvorrichtungen:** Die Schleife stoppt, wenn `current_iteration >= max_iterations` (Standard 5), oder wenn dasselbe Kriterium dreimal hintereinander mit derselben Ursache fehlschlägt (Stuck-Erkennung).

**Zentraler Unterschied zu /ultrawork:** Ultrawork ist ein einmaliger 5-Phasen-Workflow. Ralph umhüllt ultrawork in einer Retry-Schleife mit einem unabhängigen Judge, der den Abschluss objektiv verifiziert — es läuft weiter, bis die Arbeit tatsächlich fertig ist, nicht nur "reviewt".

**Gelesene Dateien:** `.agents/workflows/ralph/resources/judge-protocol.md`, alle ultrawork-Dateien.
**Geschriebene Dateien:** `session-ralph.md` (Memory), Iterationsprotokolle, Abschlussbericht.

**Einsatzbereich:** Wenn garantierter Abschluss erforderlich ist — der Agent muss weiterarbeiten, bis verifizierbare Kriterien bestehen, nicht nur einmal durchlaufen und melden.

---

## Nicht-persistente Workflows

### /plan

**Beschreibung:** PM-gesteuerte Aufgabenzerlegung. Analysiert Anforderungen, wählt den Tech-Stack, zerlegt in priorisierte Aufgaben mit Abhängigkeiten und definiert API-Verträge.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "task breakdown" |
| Englisch | "plan" |
| Koreanisch | "계획", "요구사항 분석", "스펙 분석" |
| Japanisch | "計画", "要件分析", "タスク分解" |
| Chinesisch | "计划", "需求分析", "任务分解" |

**Schritte:** Anforderungen erfassen -> Technische Machbarkeit analysieren (MCP-Code-Analyse) -> API-Verträge definieren -> In Aufgaben zerlegen -> Mit Benutzer prüfen -> Plan speichern.

**Ausgabe:** `.agents/results/plan-{sessionId}.json`, Memory-Eintrag, optional `docs/exec-plans/active/` für komplexe Pläne.

**Ausführung:** Inline (kein Subagenten-Spawning). Wird von `/orchestrate` oder `/work` konsumiert.

---

### /exec-plan

**Beschreibung:** Erstellt, verwaltet und verfolgt Ausführungspläne als erstklassige Repository-Artefakte in `docs/exec-plans/`.

**Trigger-Keywords:** Keine (von der Auto-Erkennung ausgeschlossen, muss explizit aufgerufen werden).

**Schritte:** Vorbereitung -> Umfang analysieren (Komplexität bewerten: Einfach/Mittel/Komplex) -> Ausführungsplan erstellen (Markdown in `docs/exec-plans/active/`) -> API-Verträge definieren (bei domänenübergreifenden Schnittstellen) -> Mit Benutzer prüfen -> Ausführen (an `/orchestrate` oder `/work` übergeben) -> Abschließen (nach `completed/` verschieben).

**Ausgabe:** `docs/exec-plans/active/{plan-name}.md` mit Aufgabentabelle, Entscheidungsprotokoll, Fortschrittsnotizen.

**Einsatzbereich:** Nach `/plan` für komplexe Features, die eine nachverfolgte Ausführung mit Entscheidungsprotokollierung benötigen.

---

### /brainstorm

**Beschreibung:** Design-first-Ideenfindung. Erkundet die Absicht, klärt Einschränkungen, schlägt Ansätze vor und erstellt ein genehmigtes Designdokument vor der Planung.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "brainstorm" |
| Englisch | "ideate", "explore design" |
| Koreanisch | "브레인스토밍", "아이디어", "설계 탐색" |
| Japanisch | "ブレインストーミング", "アイデア", "設計探索" |
| Chinesisch | "头脑风暴", "创意", "设计探索" |

**Schritte:** Projektkontext erkunden (MCP-Analyse) -> Klärende Fragen stellen (eine nach der anderen) -> 2-3 Ansätze mit Abwägungen vorschlagen -> Design abschnittweise präsentieren (mit Benutzergenehmigung bei jedem Schritt) -> Designdokument nach `docs/plans/` speichern -> Überleitung: `/plan` vorschlagen.

**Regeln:** Keine Implementierung oder Planung vor der Design-Genehmigung. Keine Code-Ausgabe. YAGNI.

---

### /architecture

**Beschreibung:** Software-Architektur-Workflow — Architekturprobleme diagnostizieren, die richtige Analysemethode auswählen (diagnostisches Routing / design-twice / ATAM / CBAM / ADR), Optionen vergleichen, Stakeholder-Input synthetisieren und eine Empfehlung, Review oder ADR erstellen.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "architecture", "ADR", "ATAM", "CBAM" |
| Englisch | "architecture review", "architectural tradeoff" |
| Koreanisch | "아키텍처", "설계 검토" |
| Japanisch | "アーキテクチャ" |
| Chinesisch | "架构" |

**Schritte:** Entscheidung rahmen (neue Architektur / Review / Tradeoff-Analyse / Investitionspriorisierung / ADR-Erstellung) -> Methodologie per diagnostischem Routing auswählen -> Aktuelle Architektur mittels MCP-Codeanalyse (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) analysieren -> Stakeholder-Input synthetisieren (nur wenn die Entscheidung übergreifend genug ist, um den Aufwand zu rechtfertigen) -> Empfehlung mit expliziten Annahmen, Tradeoffs, Risiken, Validierungsschritten erstellen -> An `/plan` übergeben, wenn eine Implementierung erforderlich ist.

**Regeln:** Schreiben Sie in diesem Workflow KEINE Implementierungscode oder Task-Pläne. Nach der Architekturentscheidung an `/plan` übergeben. MCP-Tools durchgängig verwenden; nicht durch rohe Dateilesungen oder grep ersetzen.

**Verwendung:** Systemarchitektur-Entscheidungen, Modul-/Service-/Ownership-Grenzen, Refactor-Priorisierung, ADR-Erstellung, Untersuchung von Architekturschmerzen (Change-Amplification, versteckte Abhängigkeiten, umständliche APIs).

---

### /deepinit

**Beschreibung:** Vollständige Projektinitialisierung. Analysiert eine vorhandene Codebasis, generiert AGENTS.md, ARCHITECTURE.md und eine strukturierte `docs/`-Wissensbasis.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "deepinit" |
| Koreanisch | "프로젝트 초기화" |
| Japanisch | "プロジェクト初期化" |
| Chinesisch | "项目初始化" |

**Schritte:** Vorbereitung -> Codebasis analysieren (Projekttyp, Architektur, implizite Regeln, Domänen, Grenzen) -> ARCHITECTURE.md generieren (Domänenkarte, unter 200 Zeilen) -> `docs/`-Wissensbasis generieren (design-docs/, exec-plans/, generated/, product-specs/, references/, Domänendokumente) -> Root-AGENTS.md generieren (~100 Zeilen, Inhaltsverzeichnis) -> Boundary-AGENTS.md-Dateien generieren (Monorepo-Pakete, unter 50 Zeilen pro Datei) -> Vorhandene Infrastruktur aktualisieren (bei erneuter Ausführung) -> Validieren (keine toten Links, Zeilenlimits).

**Ausgabe:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md und domänenspezifische Dokumentation wie entdeckt.

---

### /review

**Beschreibung:** Vollständige QA-Review-Pipeline. Sicherheitsaudit (OWASP Top 10), Performance-Analyse, Barrierefreiheitsprüfung (WCAG 2.1 AA) und Code-Qualitäts-Review.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "code review", "security audit", "security review" |
| Englisch | "review" |
| Koreanisch | "리뷰", "코드 검토", "보안 검토" |
| Japanisch | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinesisch | "审查", "代码审查", "安全审计" |

**Schritte:** Review-Umfang identifizieren -> Automatisierte Sicherheitsprüfungen (npm audit, bandit) -> Manuelle Sicherheitsprüfung (OWASP Top 10) -> Performance-Analyse -> Barrierefreiheits-Review (WCAG 2.1 AA) -> Code-Qualitäts-Review -> QA-Bericht generieren.

**Optionale Fix-Verify-Schleife** (mit `--fix`): Nach dem QA-Bericht Domänenagenten zur Behebung von CRITICAL-/HIGH-Problemen starten, QA erneut durchführen, bis zu 3-mal wiederholen.

**Delegation:** Bei großem Umfang werden die Schritte 2-7 an einen gestarteten QA-Agenten-Subagenten delegiert.

---

### /deepsec

**Beschreibung:** Steuert die `oma-deepsec`-Fähigkeit end-to-end. Installiert `.deepsec/`, kalibriert Kosten, führt scan/process/triage/revalidate/export aus, sichert PRs über `process --diff` ab, erstellt benutzerdefinierte Matcher und routet Befunde an Spezialagenten. Inline-Ausführung (keine Subagenten-Spawns).

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "/deepsec", "deepsec workflow" |
| Englisch | "run deepsec", "deepsec scan this repo", "scan repo with deepsec", "deepsec pr review", "deepsec ci gate", "deepsec triage", "deepsec matchers" |

**Schritte:**
1. **Schritt 1, Skill laden:** Lies `.agents/skills/oma-deepsec/SKILL.md` und lade nur die zur aufgelösten Intent passenden Ressourcendateien (`setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`). Existiert `.deepsec/` bereits im Repo-Root, wird der Lauf inkrementell behandelt; niemals erneut `init`.
2. **Schritt 2, Intent klassifizieren:** Auflösen in genau eine von `setup`, `scan`, `pr-review`, `matchers`, `triage`, `config`, `troubleshoot`. Multi-Intent-Prompts werden sequenziell ausgeführt. Fehlt `.deepsec/`, wird `setup` vor jede AI-Aufrufs-Intent eingefügt.
3. **Schritt 3, Agentenwahl bestätigen:** Vor jedem kostenpflichtigen Aufruf `claude` (stärkstes Reasoning, teuerste Option) vs. `codex` (Read-only-Sandbox, günstiger) bestätigen. Überspringen, wenn der Nutzer einen genannt hat, `deepsec.config.ts` `defaultAgent` setzt oder die Wahl delegiert wurde.
4. **Schritt 4, aufgelöste Intent ausführen:**
   - **4A `setup`:** `bunx deepsec init`, `bun install`, `.env.local` bearbeiten, mit `scan --limit 20` + `process --limit 5` verifizieren, dann `data/<id>/INFO.md` schreiben (50-100 Zeilen, projektspezifisch). **Erfordert Nutzerbestätigung zur `INFO.md`.**
   - **4B `scan`:** Scan -> mit `--limit 50 --concurrency 5` kalibrieren -> Kostenhochrechnung melden (explizite Nutzerfreigabe erforderlich) -> voller `process` -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`.
   - **4C `pr-review`:** Direkter Modus `process --diff origin/${BASE_REF} --comment-out comment.md`. Two-Job-CI-Muster ausgeben (`analyze` ohne `pull-requests: write`, `comment` konsumiert nur das bereinigte Artefakt). Exit `1` = mindestens ein neuer Befund.
   - **4D `matchers`:** `data/<id>/files/` nach Entry-Point-Lücken durchgehen, slug-spezifische Matcher in `.deepsec/matchers/<slug>.ts` mit passender Noise-Stufe (`precise` / `normal` / `noisy`) schreiben, über `.deepsec/deepsec.config.ts` verdrahten und mit `scan --matchers` verifizieren.
   - **4E `triage`:** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> Export auf `true-positive` / `uncertain` filtern. Wiederkehrende FP-Muster für die nächste `INFO.md`-Revision vermerken.
   - **4F `config` / `troubleshoot`:** Symptomtabelle aus `resources/config.md` anwenden.
5. **Schritt 5, Zusammenfassen und Routen:** Lauf-Zusammenfassung erzeugen (project id, Pass-Typ, agent/model, gescannte Dateien, Befunde, TP nach Revalidate, Kosten, Wall Time, Stoppbedingungen). Folgeaktionen anhand der **Schicht der verwundbaren Datei** routen (Backend -> `oma-backend`, Frontend -> `oma-frontend`, Mobile -> `oma-mobile`, IaC -> `oma-tf-infra`, DB -> `oma-db`, CI -> `oma-dev-workflow`, Doku-Drift -> `oma-docs`, Entry-Point-Lücke -> Rückkehr zu Schritt 4D). Bei mehrdeutiger Schicht oder `revalidation.verdict === "uncertain"` zuerst `oma-debug` als Triage-Hop.
6. **Schritt 6, Stoppbedingungen:** Ende bei abgeschlossener Intent + Schritt-5-Zusammenfassung, blockierender Vorbedingung (fehlendes Credential, abgelehnte `INFO.md`) oder Quota-Stop mit sicherem Resume-Kommando.

**Gelesene Dateien:** `.agents/skills/oma-deepsec/SKILL.md`, `.agents/skills/oma-deepsec/resources/*.md` (intent-scoped), `data/<id>/INFO.md`, `data/<id>/files/`, `deepsec.config.ts`.
**Geschriebene Dateien:** `.deepsec/` (bei `setup`), `.env.local` (gitignored), `data/<id>/INFO.md`, `.deepsec/matchers/<slug>.ts`, `findings/` (bei `export`), `comment.md` (bei `pr-review`).

**Regeln:** In diesem Workflow keinen Produkt-Quellcode verändern (an Spezialisten übergeben). Credentials (`vck_…`, `sk-ant-…`, OIDC-Tokens) weder ausgeben noch committen. Keinem CI-Job, der PR-gesteuerten Code ausführt, `pull-requests: write` gewähren. Fortsetzen, nicht zurücksetzen: bei Unterbrechung dasselbe Kommando erneut ausführen; niemals `rm -rf data/<id>/` ohne ausdrückliche Nutzeranweisung.

**Wann verwenden:** Agentenbasiertes Schwachstellen-Scanning eines Repos, CI/PR-Sicherheitsgating via `process --diff`, projektspezifische Matcher für Entry-Point-Abdeckung, Triage bestehender Befunde zur FP-Reduktion.

---

### /debug

**Beschreibung:** Strukturierte Bug-Diagnose und -Behebung mit Regressionstest-Erstellung und Scan nach ähnlichen Mustern.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "debug" |
| Englisch | "fix bug", "fix error", "fix crash" |
| Koreanisch | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japanisch | "デバッグ", "バグ修正", "エラー修正" |
| Chinesisch | "调试", "修复 bug", "修复错误" |

**Schritte:** Fehlerinformationen sammeln -> Reproduzieren (MCP `search_for_pattern`, `find_symbol`) -> Grundursache diagnostizieren (MCP `find_referencing_symbols` zur Rückverfolgung des Ausführungspfads) -> Minimale Korrektur vorschlagen (Benutzerbestätigung erforderlich) -> Korrektur anwenden + Regressionstest schreiben -> Nach ähnlichen Mustern scannen (kann debug-investigator-Subagenten starten, wenn Umfang > 10 Dateien) -> Bug im Memory dokumentieren.

**Kriterien für Subagenten-Start:** Fehler umfasst mehrere Domänen, Scan-Umfang > 10 Dateien oder tiefe Abhängigkeitsverfolgung erforderlich.

---

### /design

**Beschreibung:** 7-Phasen-Design-Workflow zur Erstellung von DESIGN.md mit Tokens, Komponentenmustern und Barrierefreiheitsregeln.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "design system", "DESIGN.md", "design token" |
| Englisch | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Koreanisch | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japanisch | "デザイン", "ランディングページ", "デザインシステム" |
| Chinesisch | "设计", "着陆页", "设计系统" |

**Phasen:** SETUP (Kontexterfassung, `.design-context.md`) -> EXTRACT (optional, aus Referenz-URLs/Stitch) -> ENHANCE (vage Prompt-Erweiterung) -> PROPOSE (2-3 Designrichtungen mit Farbe, Typografie, Layout, Bewegung, Komponenten) -> GENERATE (DESIGN.md + CSS-/Tailwind-/shadcn-Tokens) -> AUDIT (Responsive, WCAG 2.2, Nielsen-Heuristiken, KI-Kitsch-Prüfung) -> HANDOFF (speichern, Benutzer informieren).

**Pflicht:** Alle Ausgaben responsive-first (Mobil 320-639px, Tablet 768px+, Desktop 1024px+).

---

### /scm

**Beschreibung:** Generiert Conventional Commits mit automatischer Feature-basierter Aufteilung.

**Trigger-Keywords:** Keine (von der Auto-Erkennung ausgeschlossen).

**Schritte:** Änderungen analysieren (git status, git diff) -> Features trennen (wenn > 5 Dateien über verschiedene Scopes/Typen) -> Typ bestimmen (feat/fix/refactor/docs/test/chore/style/perf) -> Scope bestimmen (geändertes Modul) -> Beschreibung schreiben (Imperativ, < 72 Zeichen) -> Commit sofort ausführen (keine Bestätigungsaufforderung).

**Regeln:** Niemals `git add -A`. Niemals Secrets committen. HEREDOC für mehrzeilige Nachrichten. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /tools

**Beschreibung:** MCP-Tool-Sichtbarkeit und -Einschränkungen verwalten.

**Trigger-Keywords:** Keine (von der Auto-Erkennung ausgeschlossen).

**Funktionen:** Aktuellen MCP-Tool-Status anzeigen, Toolgruppen aktivieren/deaktivieren (memory, code-analysis, code-edit, file-ops), permanente oder temporäre (`--temp`) Änderungen, natürlichsprachliche Analyse ("memory tools only", "disable code edit").

**Toolgruppen:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /pdf

**Beschreibung:** PDF mit `opendataloader-pdf` in Markdown konvertieren — extrahiert Text, Tabellen, Überschriften und Bilder in korrekter Leseordnung.

**Trigger-Keywords:** Keine (muss explizit mit einem Eingabedateipfad aufgerufen werden).

**Schritte:** Eingabe validieren (Dateiexistenz bestätigen) -> Ausgabespeicherort bestimmen (benutzerdefiniert oder gleiches Verzeichnis wie Eingabe) -> `uvx opendataloader-pdf` ausführen (keine Installation erforderlich) -> Für gescannte PDFs Hybridmodus mit OCR verwenden -> Ausgabe mit `uvx mdformat` normalisieren -> Lesbarkeit und Struktur validieren -> Konvertierungsprobleme (fehlende Tabellen, verstümmelter Text) melden.

**Regeln:** Standard-Ausgabespeicherort ist das gleiche Verzeichnis wie die Eingabe-PDF. Überspringen Sie nie Schritte. Die Antwortsprache folgt `.agents/oma-config.yaml`.

**Verwendung:** PDF-Dokumente in Markdown für LLM-Kontext oder RAG-Ingestion konvertieren, strukturierte Inhalte (Tabellen, Überschriften, Listen) aus PDFs extrahieren.

---

### /stack-set

**Beschreibung:** Projekt-Tech-Stack automatisch erkennen und sprachspezifische Referenzen für den Backend-Skill generieren.

**Trigger-Keywords:** Keine (von der Auto-Erkennung ausgeschlossen).

**Schritte:** Erkennen (Manifeste scannen: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj) -> Bestätigen (erkannten Stack anzeigen, Benutzerbestätigung einholen) -> Generieren (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` mit 8 Pflichtmustern, `stack/api-template.*`) -> Verifizieren.

**Ausgabe:** Dateien in `.agents/skills/oma-backend/stack/`. Modifiziert weder SKILL.md noch `resources/`.

---

## Skills vs. Workflows

| Aspekt | Skills | Workflows |
|--------|--------|-----------|
| **Was sie sind** | Agentenexpertise (was ein Agent weiß) | Orchestrierte Prozesse (wie Agenten zusammenarbeiten) |
| **Speicherort** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Aktivierung** | Automatisch über Skill-Routing-Keywords | Slash-Befehle oder Trigger-Keywords |
| **Umfang** | Einzeldomänen-Ausführung | Mehrstufig, oft multi-agentisch |
| **Beispiele** | "Baue eine React-Komponente" | "Feature planen -> bauen -> prüfen -> committen" |

---

## Auto-Erkennung: Funktionsweise

### Das Hook-System

oh-my-agent verwendet einen `UserPromptSubmit`-Hook, der vor der Verarbeitung jeder Benutzernachricht ausgeführt wird. Das Hook-System besteht aus:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Definiert Keyword-zu-Workflow-Zuordnungen für alle 11 unterstützten Sprachen (Englisch, Koreanisch, Japanisch, Chinesisch, Spanisch, Französisch, Deutsch, Portugiesisch, Russisch, Niederländisch, Polnisch).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): TypeScript-Logik, die die Benutzereingabe gegen die Trigger-Keywords scannt, sprachspezifische Zuordnung berücksichtigt und den Workflow-Aktivierungskontext injiziert.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Erzwingt die Ausführung persistenter Workflows, indem aktive Zustandsdateien geprüft und der Workflow-Kontext erneut injiziert werden.

### Erkennungsablauf

1. Der Benutzer gibt eine natürlichsprachliche Eingabe ein.
2. Der Hook prüft, ob ein expliziter `/command` vorhanden ist (falls ja, wird die Erkennung übersprungen, um Duplizierung zu vermeiden).
3. Der Hook bereinigt die Eingabe (entfernt Codeblöcke, zitierte Strings sowie eingefügte System-Echo-Blöcke) und scannt sie anschließend gegen `.agents/hooks/core/triggers.json` — sowohl Keyword-Listen (wörtliche Phrasen) als auch `patterns` (rohe Regex). Ein Verstärkungsschutz unterdrückt erneute Auslöser, wenn derselbe Workflow innerhalb der letzten 60 Sekunden bereits zweimal oder häufiger ausgelöst wurde.
4. Bei einer Übereinstimmung wird geprüft, ob die Eingabe informationellen Mustern entspricht.
5. Bei informationellem Charakter (z. B. "was ist orchestrate?") wird die Eingabe herausgefiltert — es wird kein Workflow ausgelöst.
6. Bei handlungsrelevantem Charakter wird `[OMA WORKFLOW: {workflow-name}]` in den Kontext injiziert.
7. Der Agent liest das injizierte Tag und lädt die entsprechende Workflow-Datei aus `.agents/workflows/`.

### Sprachabschnitt-Konvention

`.agents/hooks/core/triggers.json` verwendet eine sprachspezifische Abschnittsstruktur für `keywords`, `patterns` und `informationalPatterns`:

| Abschnitt | Verhalten |
|-----------|-----------|
| `*` | Universal — wird unabhängig von der Einstellung `language` in `.agents/oma-config.yaml` immer geladen. Verwenden Sie ihn für englische Inhalte (Lingua franca) und für wirklich sprachübergreifende Tokens (z. B. Workflow-Name `"orchestrate"`). |
| `en` | Englisch — wird aus Gründen der Abwärtskompatibilität geladen. Funktional gleichwertig mit `*`. Neue englische Inhalte gehören in `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Sprachspezifisch — wird nur geladen, wenn `language: <lang>` in `.agents/oma-config.yaml` gesetzt ist. |

**Implikation**: Wenn Sie `language: en` in `.agents/oma-config.yaml` setzen, werden nur die Muster von `*` und `en` geladen. Koreanische, japanische usw. natürlichsprachliche Trigger werden nicht ausgelöst, selbst wenn der Benutzer in diesen Sprachen schreibt. Um eine nicht-englische Sprache zu aktivieren, setzen Sie `language: <code>` entsprechend. Der englische Fallback in `*` bleibt stets aktiv.

### Pattern-Feld (rohe Regex) {#pattern-field-raw-regex}

Zusätzlich zu wörtlichen `keywords` kann jeder Workflow `patterns` deklarieren — rohe Regex-Strings, die mit den Flags `iu` kompiliert werden. Patterns ermöglichen mehrteilige Absichtsmatches, die andernfalls kombinatorische Keyword-Listen erfordern würden.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "keywords": { "*": ["orchestrate"], "en": ["parallel", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:an?|the)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Autorenregeln:
- Strings werden direkt kompiliert — Backslashes einmal für JSON, einmal für Regex escapen (`\\b`, `\\s+`)
- Keine automatische Wortgrenzen-Umrahmung — Pattern-Autoren behandeln `\b` selbst
- Ungültige Regex wird zur Laufzeit stillschweigend übersprungen (zum Bearbeitungszeitpunkt der Konfiguration über Testfehler sichtbar)

### Filterung informationeller Muster

Der Abschnitt `informationalPatterns` in `.agents/hooks/core/triggers.json` definiert Phrasen, die auf Fragen statt Befehle hindeuten. Geprüft in einem 60-Zeichen-Fenster um jeden potenziellen Workflow-Treffer:

| Abschnitt | Beispiele für Muster |
|-----------|----------------------|
| `*` (universal Englisch) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Wenn die Eingabe sowohl einem Workflow-Trigger als auch einem informationellen Muster entspricht, hat das informationelle Muster Vorrang und es wird kein Workflow ausgelöst. Damit werden Prompts wie die folgenden blockiert:
- `"How do you build a TODO app?"` — `how do` in `*` blockiert die orchestrate-Absichts-Regex
- `"orchestrate 트리거 해주면 되나요?"` (unter `language: ko`) — `트리거` in `ko` blockiert das orchestrate-Keyword

### Ausgeschlossene Workflows

Die folgenden Workflows sind von der Auto-Erkennung ausgeschlossen und müssen mit einem expliziten `/command` aufgerufen werden:
- `/scm`
- `/tools`
- `/stack-set`
- `/exec-plan`
- `/pdf`

---

## Mechanik des persistenten Modus

### Zustandsdateien

Persistente Workflows (orchestrate, ultrawork, work) erstellen Zustandsdateien in `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

Diese Dateien enthalten: Workflow-Name, aktuelle Phase/aktueller Schritt, Sitzungs-ID, Zeitstempel und etwaigen ausstehenden Zustand.

### Verstärkung

Während ein persistenter Workflow aktiv ist, injiziert der `persistent-mode.ts`-Hook `[OMA PERSISTENT MODE: {workflow-name}]` in jede Benutzernachricht. Dies stellt sicher, dass der Workflow auch über Konversationszüge hinweg weiter ausgeführt wird.

### Deaktivierung

Um einen persistenten Workflow zu deaktivieren, sagt der Benutzer "workflow done" (oder das Äquivalent in seiner konfigurierten Sprache). Dies bewirkt:
1. Die Zustandsdatei wird aus `.agents/state/` gelöscht
2. Die Injektion des persistenten Modus-Kontexts wird gestoppt
3. Rückkehr zum Normalbetrieb

Der Workflow kann auch natürlich enden, wenn alle Schritte abgeschlossen sind und das abschließende Gate bestanden wird.

---

## Typische Workflow-Abfolgen

### Schnelles Feature
```
/plan → Ausgabe prüfen → /exec-plan
```

### Komplexes domänenübergreifendes Projekt
```
/work → PM plant → Benutzer bestätigt → Agenten starten → QA prüft → Probleme beheben → ausliefern
```

### Maximale Lieferqualität
```
/ultrawork → PLAN (4 Review-Schritte) → IMPL → VERIFY (3 Review-Schritte) → REFINE (5 Review-Schritte) → SHIP (4 Review-Schritte)
```

### Bug-Untersuchung
```
/debug → reproduzieren → Grundursache → minimale Korrektur → Regressionstest → Scan nach ähnlichen Mustern
```

### Design-zu-Implementierung-Pipeline
```
/brainstorm → Designdokument → /plan → Aufgabenzerlegung → /orchestrate → parallele Implementierung → /review → /scm
```

### Neue-Codebasis-Einrichtung
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
