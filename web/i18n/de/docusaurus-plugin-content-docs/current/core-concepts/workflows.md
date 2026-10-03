---
title: Workflows
description: Vollständige Referenz aller 21 oh-my-agent-Workflows mit Slash-Befehlen, persistenten und nicht-persistenten Modi, Trigger-Keywords in 11 Sprachen, Phasen und Schritten, gelesenen und geschriebenen Dateien, Auto-Erkennung über triggers.json und keyword-detector.ts, Filterung informationeller Muster und Zustandsverwaltung.
---

# Workflows

Workflows sind strukturierte mehrstufige Prozesse, die durch Slash-Befehle oder natürlichsprachliche Keywords ausgelöst werden. Sie definieren, wie Agenten bei Aufgaben zusammenarbeiten — von einphasigen Hilfsprogrammen bis hin zu komplexen 5-Phasen-Qualitäts-Gates.

Es gibt 21 Workflows, davon sind 4 persistent (sie halten den Zustand und können nicht versehentlich unterbrochen werden).

---

## Skill oder Workflow auswählen {#choosing-a-skill-or-workflow}

Wählen Sie nach dem Koordinations- und Prüfbedarf der Aufgabe. Folgen Sie einem bereits gewählten Workflow; führen Sie einen aktiven Workflow weiter, sofern Sie ihn nicht ausdrücklich abbrechen oder wechseln. Für eine neue Aufgabe ohne ausgewählten Workflow gilt diese Orientierung:

| Bedarf der Aufgabe | Auswahl | Beispiel |
|---|---|---|
| Eine Domäne ohne Koordination zwischen Agenten | [Einzelner Skill](/docs/guide/single-skill) | Einen API-Endpunkt ergänzen und seine Validierung testen |
| Mehrere Domänen mit schrittweiser Planung, Implementierung und QA | `/work` | Eine API-Änderung mit den Web- und Mobile-Clients koordinieren |
| Automatische Delegation unabhängiger Aufgaben zur parallelen Ausführung | `/orchestrate` | Backend- und Frontend-Aufgaben nach Klärung der Abhängigkeiten parallel implementieren |
| Ausdrücklich angeforderter umfassender Qualitätsprozess | `/ultrawork` | Alle Reviews für Planung, Implementierung, Verifikation, Verbesserung und Auslieferungsbereitschaft durchführen |
| Ausdrücklicher Auftrag, die Ausführung bis zum Bestehen mechanisch prüfbarer Kriterien zu wiederholen | `/ralph` | Implementierung und unabhängige Prüfung wiederholen, bis die festgelegten Regressionsprüfungen bestehen, innerhalb der Schutzvorrichtungen |

`/orchestrate` lädt einen verwendbaren Plan oder erstellt ihn über `/plan`, bevor Agenten starten. Sie müssen `/plan` nicht vorher ausführen. Ein vorhandener Plan ist daher kein Unterscheidungsmerkmal zwischen `/work` und `/orchestrate`; entscheidend ist die gewünschte Koordination. Beide können unabhängige Aufgaben parallel ausführen.

Akzeptanzkriterien und Tests gehören auch zu Aufgaben mit einem einzelnen Skill. Allein ihr Vorhandensein erfordert kein `/ralph`: Jede Ralph-Iteration führt den gesamten ultrawork-Prozess und einen unabhängigen Judge aus. Wählen Sie Ralph, wenn Sie diese Prüfschleife wiederholen möchten. Schutzvorrichtungen können die Ausführung beenden, obwohl Aufgaben noch unvollständig oder blockiert sind.

Diese Tabelle ist eine Auswahlhilfe, kein automatischer Workflow-Router. Der Host-Agent kann eine geeignete Vorgehensweise empfehlen; das Empfehlen oder Erklären eines Workflows startet ihn nicht. Ein Slash-Befehl wählt ihn ausdrücklich aus. Ist der Hook zur Keyword-Erkennung aktiviert, können passende konfigurierte Keywords oder Muster ebenfalls einen Workflow aktivieren, sofern die Filter für Informationsfragen dies zulassen. Der Detektor klassifiziert nicht die Anzahl der Domänen, prüft nicht die Ausführbarkeit eines Plans und wendet diese Tabelle nicht als Prioritätsalgorithmus an.

Die Planprüfung nutzt die bereits erteilte Autorisierung für die Aufgabe. Agenten fragen nur nach einer wesentlichen fehlenden Entscheidung oder einer Aktion außerhalb dieses Umfangs. Eine Prüfung der Auslieferungsbereitschaft autorisiert für sich genommen weder Veröffentlichung noch Deployment.

---

## Persistente Workflows {#persistent-workflows}

Persistente Workflows laufen weiter, bis alle Aufgaben erledigt sind. Sie halten den Zustand in `.agents/state/` und injizieren bei jeder Benutzernachricht den Kontext `[OMA PERSISTENT MODE: ...]` erneut, bis sie explizit deaktiviert werden.

Der persistente Modus startet nur bei einem **expliziten Aufruf** — dem eigenen Namen des Workflows (die Liste `explicit` in `triggers.json`, z. B. "orchestrate", "ultrawork"/"ulw", "ralph"/"랄프", "work mode"). Die übrigen Trigger-Keywords unten sind Hinweise in natürlicher Sprache: Sie injizieren den Workflow als Vorschlag, ohne den persistenten Modus zu aktivieren, und lösen nie aus, wenn die erste oder letzte Zeile des Prompts eine mit `?` endende Frage ist.

### /orchestrate

**Beschreibung:** Automatisierte parallele Agentenausführung über die CLI. Startet Subagenten über die CLI, koordiniert mit dauerhaftem Laufzeitstatus und Ausführungsbelegen (Receipts), überwacht den Fortschritt und führt Verifikationsschleifen aus.

**Persistent:** Ja. Zustandsdatei: `.agents/state/orchestrate-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Explizit (persistent) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| Englisch | "do everything", "run everything", "everything in parallel", "automate everything" |
| Koreanisch | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Japanisch | "全部実行", "全部並列で", "自動でやって" |
| Chinesisch | "编排", "全部执行", "全部并行", "自动处理" |
| Spanisch | "ejecutar todo", "todo en paralelo" |
| Französisch | "tout exécuter", "tout en parallèle" |
| Deutsch | "alles ausführen", "alles parallel" |
| Portugiesisch | "executar tudo", "tudo em paralelo" |
| Russisch | "выполнить всё", "всё параллельно" |
| Niederländisch | "alles uitvoeren", "alles parallel" |
| Polnisch | "wykonaj wszystko", "wszystko równolegle" |

Die bloßen Wörter "parallel"/"automate" (und ihre Übersetzungen) sind keine Trigger: "run the tests in parallel" oder "automate the release notes" sind gewöhnliche Anfragen, keine Multi-Agenten-Orchestrierung.

**Trigger-Regex-Muster** (Absicht + Substantiv-Whitelist, siehe [Auto-Erkennung: Pattern-Feld](#pattern-field-raw-regex)):
| Abschnitt | Muster | Beispiele, die auslösen |
|-----------|--------|------------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Baue eine TODO-App mit Benutzerauthentifizierung", "Erstelle einen guten Webservice", "Entwickle ein Backend mit PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Substantiv-Whitelist (14): app, api, service, server, cli, tool, website, dashboard, system, backend, frontend, prototype, mvp, bot. Ein einzelnes Feature ("implement the login feature", "로그인 기능 구현해줘") oder etwas Bestehendes ("make the API faster") führt zu keinem Treffer.

**Schritte:**
1. **Schritt 0 — Vorbereitung:** Koordinations-Skill, Context-Loading-Leitfaden und Memory-Protokoll lesen. Vendor erkennen.
2. **Schritt 1 — Plan laden/erstellen:** `.agents/results/plan-{sessionId}.json`, danach den neuesten `plan-*.json` prüfen. Fehlt ein Plan oder ist er nicht ausführungsbereit (Aufgabe ohne Agent, Prioritätsstufe, Abhängigkeiten oder Akzeptanzkriterien), `/plan` inline mit derselben Sitzungs-ID aufrufen. Den Plan vorstellen und die bestehende Autorisierung nutzen; vor der Delegation nur wesentliche fehlende Entscheidungen oder eine neue Autorisierung erfragen.
3. **Schritt 2 — Sitzung initialisieren:** `oma-config.yaml` laden, CLI-Zuordnung anzeigen, die Sitzungs-ID aus der Planerstellung wiederverwenden oder eine neue erzeugen (`session-YYYYMMDD-HHMMSS`) und `orchestrator-session-{sessionId}.md` sowie `task-board-{sessionId}.md` im konfigurierten Memory-Speicher anlegen.
4. **Schritt 3 — Agenten starten:** Für jede Prioritätsstufe (zuerst P0, dann P1 ...) Agenten mit der passenden Vendor-Methode starten (native Subagenten bei passendem Runtime-/Vendor-Paar, `oma agent spawn` für externe oder Cross-Vendor-Arbeit). MAX_PARALLEL nie überschreiten.
5. **Schritt 4 — Überwachen:** Run-bezogene `progress-{agentId}-{taskId}-{runId}-{sessionId}.md`-Dateien und strukturierte Ausführungsbelege (Receipts) abfragen, dann das Task Board aktualisieren. Abschlüsse, Fehler und Abstürze beobachten.
6. **Schritt 5 — Verifizieren:** Pro abgeschlossenem Agenten `verify.sh {agent-type} {workspace}` ausführen. Bei Fehlschlag mit Fehlerkontext erneut starten (maximal 2 Wiederholungen). Wiederholte Fehlschläge können alternative Hypothesen rechtfertigen, doch alle Versuche verbrauchen dasselbe Gesamtbudget für die Wiederherstellung. Ungeklärte Belege sichern, wenn das Budget keine Vergleichsrunde abdeckt.
7. **Schritt 6 — Zusammentragen:** Run-bezogene Ergebnisdateien und strukturierte Ergebnisdeklarationen (Claims) lesen und die Zusammenfassung erstellen.
8. **Schritt 7 — Abschlussbericht:** Sitzungszusammenfassung präsentieren. Wenn Experimente durchgeführt wurden, Belege und Entscheidungen zusammenfassen; Lessons nur festhalten, wenn eine wiederverwendbare Ursache feststeht.

**Gelesene Dateien:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, run-bezogene Fortschritts-/Ergebnisdateien und strukturierte Ausführungsbelege (Run-Receipts).
**Geschriebene Dateien:** Run-bezogener Sitzungs- und Task-Board-Status im konfigurierten Memory-Speicher, strukturierte Ausführungsbelege (Receipts) und Ergebnisdeklarationen (Claims) sowie der Abschlussbericht.

**Einsatzbereich:** Große Projekte, die maximale Parallelität mit automatisierter Koordination erfordern.

---

### /work

**Beschreibung:** Schrittweise domänenübergreifende Koordination. PM plant zuerst, dann führen Agenten die Aufgaben im autorisierten Umfang aus, gefolgt von QA-Review und Problembehebung.

**Persistent:** Ja. Zustandsdatei: `.agents/state/work-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Explizit (persistent) | "work mode", "work workflow" |
| Universal | "step by step" |
| Englisch | "one by one", "one step at a time" |
| Koreanisch | "단계별", "하나씩 해줘", "차근차근" |
| Japanisch | "ステップバイステップ", "一歩ずつ" |
| Chinesisch | "逐步", "一步一步" |
| Spanisch | "paso a paso", "uno por uno" |
| Französisch | "étape par étape", "un par un" |
| Deutsch | "schritt für schritt", "der reihe nach" |

Das bloße Wort "work" ist kein Trigger — es ist gewöhnliches Vokabular ("Does this work on Windows?").

**Schritte:**
1. **Schritt 0 — Vorbereitung:** Skills, Context-Loading, Memory-Protokoll lesen. Sitzungsstart aufzeichnen.
2. **Schritt 1 — Anforderungen analysieren:** Beteiligte Domänen identifizieren. Bei einzelner Domäne direkte Agentenverwendung vorschlagen.
3. **Schritt 2 — PM-Agent-Planung:** PM zerlegt Anforderungen, definiert API-Verträge, erstellt priorisierte Aufgabenaufschlüsselung, speichert in `.agents/results/plan-{sessionId}.json`.
4. **Schritt 3 — Plan prüfen:** Den Plan vorstellen und im Rahmen der bestehenden Autorisierung fortfahren. Nur wesentliche fehlende Entscheidungen oder eine neue Autorisierung erfragen.
5. **Schritt 4 — Agenten starten:** Start nach Prioritätsstufe, parallel innerhalb derselben Stufe, separate Workspaces.
6. **Schritt 5 — Überwachen:** Fortschrittsdateien abfragen, API-Vertrags-Übereinstimmung zwischen Agenten verifizieren.
7. **Schritt 6 — QA-Review:** QA-Agenten für Sicherheit (OWASP), Performance, Barrierefreiheit, Code-Qualität starten.
8. **Schritt 6.1 — Messungen** (bedingt): Eine Baseline aufzeichnen, wenn ein definierter Vergleich erforderlich ist.
9. **Schritt 7 — Iterieren:** Bei CRITICAL-/HIGH-Problemen zuständige Agenten erneut starten. Besteht dasselbe Problem nach 2 Versuchen weiter, Explorationsschleife aktivieren.

**Einsatzbereich:** Features über mehrere Domänen hinweg, deren Planung, Implementierung und QA Sie schrittweise koordinieren möchten.

---

### /ultrawork

**Beschreibung:** Der qualitätsfokussierte Workflow. Er umfasst 5 Phasen, insgesamt 17 Schritte und 12 isolierte Review-Schritte. Jede Phase hat ein Gate, das vor dem Fortfahren bestanden werden muss.

**Persistent:** Ja. Zustandsdatei: `.agents/state/ultrawork-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Explizit (persistent) | "ultrawork", "ulw" |

**Phasen und Schritte:**

| Phase | Schritte | Agent | Review-Perspektive |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM-Agent (inline) | Vollständigkeit, Meta-Review, Überarbeitung/Einfachheit |
| **IMPL** | 5 | Dev-Agenten (gestartet) | Implementierung |
| **VERIFY** | 6-8 | QA-Agent (gestartet) | Übereinstimmung, Sicherheit (OWASP), Regressionsprävention |
| **REFINE** | 9-13 | Refactor-Agent (gestartet) | Dateiaufteilung, Wiederverwendbarkeit, Kaskadenauswirkung, Konsistenz, toter Code |
| **SHIP** | 14-17 | QA-Agent (gestartet) | Code-Qualität (Lint/Abdeckung), UX-Flow, Verwandte Probleme, Deployment-Bereitschaft |

**Gate-Definitionen:**
- **PLAN_GATE:** Plan dokumentiert, Annahmen aufgelistet, Alternativen berücksichtigt, Überarbeitungs-Review durchgeführt, Umfang autorisiert.
- **IMPL_GATE:** Anwendbare Prüfungen ohne Dateiausgabe und Tests bestehen, nur geplante Dateien modifiziert, Baseline-Belege für tatsächliche Experimente aufgezeichnet. Build-Prüfungen werden nur auf ausdrücklichen Wunsch ausgeführt.
- **VERIFY_GATE:** Implementierung entspricht Anforderungen, null CRITICAL, null HIGH, keine Regressionen, anwendbare Messziele des Projekts erreicht.
- **REFINE_GATE:** Wartbarkeitsregeln des Projekts eingehalten, Integrationsmöglichkeiten erfasst, Seiteneffekte verifiziert, Code bereinigt, keine ungelöste Regression.
- **SHIP_GATE:** Qualitätsprüfungen bestehen, UX verifiziert, verwandte Probleme gelöst, Deployment-Checkliste komplett, anwendbare Messziele des Projekts mit aktuellen Belegen erreicht. Bestehende Autorisierung nutzen; Veröffentlichung oder Deployment erfordert eine Autorisierung für diese Aktion.

**Verhalten bei Gate-Fehlschlag:**
- Erster Fehlschlag: zum relevanten Schritt zurückkehren, beheben und erneut versuchen.
- Zweiter Fehlschlag beim selben Problem: Ursache neu bewerten; wenn Alternativen im verbleibenden Budget einen Test verdienen, isolierte Experimente mit dem geforderten Verhalten und den definierten Metriken abgleichen.

**Bedingte Erweiterungen:** Vergleiche anhand definierter Metriken, Entscheidungen und Belege zu Experimenten, budgetierte Hypothesenexploration sowie Erkenntnisse, die auf wiederverwendbaren Ursachen beruhen.

**REFINE-Überspringbedingung:** Einfache Aufgaben unter 50 Zeilen.

**Einsatzbereich:** Ein umfassender Review-Prozess, bevor entschieden wird, ob das Ergebnis auslieferungsbereit ist. Der Workflow hält Prüfungen und Befunde fest; er entscheidet nicht selbst über Produktionsreife.

---

### /ralph

**Beschreibung:** Persistente, selbstreferenzielle Ausführungsschleife. Umhüllt ultrawork mit einem unabhängigen Verifier, der die Abschlusskriterien nach jeder Iteration prüft. Meldet vollständigen Abschluss, wenn alle Kriterien bestehen, teilweisen Abschluss, wenn nur bestandene und blockierte Kriterien verbleiben, oder stoppt beim Auslösen einer Schutzvorrichtung.

**Persistent:** Ja. Zustandsdatei: `.agents/state/ralph-state.json`.

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Explizit (persistent) | "ralph", "랄프" |
| Englisch | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Koreanisch | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Japanisch | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinesisch | "不要停", "直到完成", "全部完成", "做完为止" |
| Spanisch | "no pares", "hasta completar", "termina todo" |
| Französisch | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Deutsch | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

Bloße Wiederaufnahme-Phrasen ("keep going", "carry on", "계속해", "続けて", "продолжай", …) sind keine Trigger: Benutzer tippen sie, um nach einer Unterbrechung fortzufahren.

**Phasen:**
1. **Phase 0 — INIT:** Voraussetzungen laden (Context-Loading, Memory-Protokoll, Judge-Protokoll). Mechanisch prüfbare Abschlusskriterien definieren und aufzeichnen, etwa Test-Assertions, Typprüfungen ohne Dateiausgabe, Exit-Codes oder die Existenz von Dateien. Build-Prüfungen nur auf ausdrücklichen Wunsch aufnehmen. Kriterien vorstellen und im autorisierten Umfang fortfahren. Sitzung mit `max_iterations: 5` initialisieren.
2. **Phase 1 — WORK:** Ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) als eine einzelne Iteration ausführen.
3. **Phase 2 — JUDGE:** Unabhängiger Verifier prüft jedes Abschlusskriterium gegen den tatsächlichen Projektzustand (autorisierte Prüfungen ausführen und die Existenz von Dateien verifizieren). Nachweise und den Status jedes Kriteriums aufzeichnen, darunter PASS, FAIL, REGRESSED oder BLOCKED.
4. **Phase 3 — DECIDE:** Bei ausschließlich PASS vollständigen Abschluss melden. Verbleiben nur PASS und BLOCKED, teilweisen Abschluss melden. Bei FAIL oder REGRESSED den Fehlerkontext an die nächste Iteration weitergeben, sofern die Schutzvorrichtungen dies zulassen.
5. **Schutzvorrichtungen:** Die Schleife stoppt, wenn `current_iteration >= max_iterations` (Standard 5), oder wenn dasselbe Kriterium dreimal hintereinander mit derselben Ursache fehlschlägt (Stuck-Erkennung).

**Zentraler Unterschied zu /ultrawork:** Ultrawork führt einen Prozess mit 5 Phasen aus und wiederholt Arbeiten bei fehlgeschlagenen Phasen-Gates. Ralph umhüllt ultrawork mit einer Retry-Schleife und einem unabhängigen Judge, der den Abschluss objektiv verifiziert. Die Schleife endet mit einem Bericht über vollständigen Abschluss, teilweisen Abschluss bei blockierten Aufgaben oder einen Stopp durch Schutzvorrichtungen.

**Gelesene Dateien:** `.agents/workflows/ralph/resources/judge-protocol.md`, alle ultrawork-Dateien.
**Geschriebene Dateien:** `session-ralph.md` (Memory), Iterationsprotokolle, Abschlussbericht.

**Einsatzbereich:** Wenn Sie ausdrücklich wiederholte Ausführung und unabhängige Verifikation anhand mechanischer Abschlusskriterien wünschen. Tests allein erfordern kein Ralph; berücksichtigen Sie den vollständigen ultrawork-Prozess in jeder Iteration und seine Schutzvorrichtungen.

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

**Schritte:** Anforderungen erfassen -> technische Machbarkeit analysieren (MCP-Code-Analyse) -> Komplexität einstufen (Simple/Medium/Complex) -> API-Verträge definieren (bei Cross-Boundary-Arbeit) -> in Aufgaben zerlegen -> mit dem Benutzer prüfen -> Plan-Artefakte speichern (maschinenlesbares JSON und für Medium/Complex ein menschenlesbares Markdown-Task-Board).

**Ausgabe:** `.agents/results/plan-{sessionId}.json`, Memory-Eintrag und bei Medium/Complex `docs/plans/work/{NNN}-{name}.md` mit Aufgabentabelle, Entscheidungsprotokoll und Fortschrittsnotizen. Der Lebenszyklus wird über das Feld `Status` im Markdown-Kopf (`Active` -> `Completed`) verfolgt; Pläne wechseln nicht zwischen Verzeichnissen. Über `/brainstorm` erstellte Designs liegen in `docs/plans/designs/{NNN}-{name}.md`.

**Ausführung:** Inline (kein Subagenten-Spawning). Wird von `/orchestrate` oder `/work` verwendet; beide aktualisieren Aufgaben- und Statusfelder während der Ausführung.

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
| Koreanisch | "딥섹 워크플로우", "딥섹 실행", "딥섹 스캔", "딥섹으로 검사", "딥섹 PR 리뷰", "딥섹 CI 게이트" |
| Japanisch | "ディープセック実行", "deepsecワークフロー", "deepsecでスキャン", "deepsec PRレビュー" |
| Chinesisch | "运行 deepsec", "deepsec 工作流", "用 deepsec 扫描", "deepsec PR 审查" |

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

**Regeln:** Niemals `git add -A`. Niemals Secrets committen. HEREDOC für mehrzeilige Nachrichten. Einen Co-Author-Trailer nur hinzufügen, wenn die Konfiguration `scm.co_author` aktiviert ist und beide Werte liefert.

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

### /convert

**Beschreibung:** Konvertiert eine Datei von einem Format in ein anderes, geroutet nach Medienkategorie. **Dokumente** (PDF über `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML über `kordoc`/`oma-hwp`) werden zu Markdown extrahiert. **Bild**-, **Video**- und **Audio**-Dateien werden über `ffmpeg` (bereits für `oma-video` bereitgestellt) in ein Zielformat transkodiert.

**Trigger-Keywords:** Keine (wird explizit mit einem Eingabedateipfad aufgerufen).

**Schritte:** Eingabe validieren & nach Kategorie routen (Dokument `.pdf`/`.hwp*`; Bild `.jpg`/`.png`/`.webp`/…; Video `.mp4`/`.mov`/…; Audio `.mp3`/`.wav`/…) -> Zielformat bestimmen (Dokument-Standard = Markdown; Medien = explizites `--to`) -> Konvertieren (PDF: `uvx opendataloader-pdf`, gescannte PDFs nutzen hybrides OCR; HWP: `bunx kordoc@latest`; Medien: `ffmpeg`) -> Dokumente normalisieren (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> Verifizieren (Markdown lesen / Medien mit `ffprobe`) -> Quell- und Zielformat sowie etwaige Qualitäts-/Codec-Entscheidungen melden.

**Regeln:** Nach Kategorie routen — niemals einen Dokumentkonverter auf eine Mediendatei anwenden oder umgekehrt. Standard-Ausgabespeicherort ist das gleiche Verzeichnis wie die Eingabedatei. Qualitäts-/Codec-Entscheidungen für Medien melden (Transkodierung ist nicht verlustfrei). Überspringen Sie nie Schritte. Die Antwortsprache folgt `.agents/oma-config.yaml`.

**Verwendung:** PDF- oder koreanische HWP-Dokumente in Markdown für LLM-/RAG-Ingestion konvertieren oder Bilder (jpg→webp/png), Videos (mov→mp4, mp4→gif) und Audio (wav→mp3) zwischen Formaten transkodieren.

---

### /docs

**Beschreibung:** Dokumentations-Drift mit `oma-docs` erkennen und synchronisieren. Der Verify-Modus findet defekte Referenzen in allen Markdown-Dateien des Repos (Standard-Glob `**/*.md`); der Sync-Modus schlägt pro Dokument Patches für Docs vor, die von einem Git-Diff betroffen sind. Der Workflow läuft inline (kein Subagent-Spawning); alle Vendors rufen direkt `oma docs` auf.

**Trigger-Keywords:** Universal: "oma-docs", "docs verify", "docs sync". Englisch: "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". Koreanisch: "문서 검증", "문서 드리프트", "문서 동기화". Japanisch: "ドキュメント検証", "ドキュメント同期". Chinesisch: "文档校验", "文档同步".

**Schritte:** Modus erkennen (`verify` standardmäßig; `sync`, wenn der Prompt Sync erwähnt oder einen Git-Diff-Bereich angibt) -> Vorprüfung (`command -v oma`; bei Sync einen verwendbaren Diff bestätigen, sonst auf `HEAD~1..HEAD` zurückfallen) -> Verify: `oma docs verify --json` (Exit `0` sauber, `1` defekte Referenzen) oder Sync: `oma docs sync --json` über den Bereich -> Befunde nach dem Host-LLM-Vertrag synthetisieren (Verify: nach CRITICAL/HIGH/MEDIUM/LOW gruppieren und konkrete Korrekturen nennen; Sync: minimale Unified-Diff-Patches entwerfen) -> jeden Sync-Patch interaktiv anzeigen (`[y] apply [n] skip [d] show diff [s] show full proposal`; nie automatisch anwenden) -> nach dem Anwenden den Index mit `oma docs verify --json` neu erzeugen -> Modus, Zählungen nach Art sowie Verweise auf `docs/generated/doc-refs.json` und `url-drift.json` melden.

**Regeln:** Sync-Patches nie automatisch anwenden (pro Dokument ist `[y]` erforderlich). `.agents/` (SSOT) nie ändern. Fehlt `oma docs`, einen Installationshinweis ausgeben und beenden — nicht auf manuelle Greps ausweichen.

**Gelesene Dateien:** Zieldokumentation (`**/*.md` oder angeforderter Glob), bei Sync `git diff` für `changedFiles`.
**Geschriebene Dateien:** `docs/generated/doc-refs.json` (bei Verify immer neu erzeugt), `docs/generated/url-drift.json` (bei URL-Prüfung), freigegebene Dokument-Patches (bei Sync `[y]`).

**Einsatzbereich:** Prüfen, ob die Dokumentation noch zur Codebasis passt (Dateipfade, CLI-Befehle, Konfigurationsschlüssel, Umgebungsvariablen), oder Patches nach Codeänderungen vorschlagen.

---

### /recap

**Beschreibung:** Tages- oder Zeitraum-Zusammenfassung über `oma-recap`. Löst Datum oder Zeitfenster aus natürlicher Sprache auf, ruft mit `oma recap --json` mehrere KI-Tool-Historien ab (Grok, Claude, Codex, Qwen, Cursor, Antigravity), übergibt Themenanalyse und Markdown-Formatierung an den Skill und meldet TL;DR sowie Speicherpfad. Der Workflow läuft inline (kein Subagent-Spawning); alle Vendors rufen direkt `oma recap` auf.

**Trigger-Keywords:** Universal: "recap". Koreanisch: "리캡". Japanisch: "リキャップ".

**Schritte:** Modus erkennen und Fenster auflösen (`daily` standardmäßig mit heute; `period`, wenn Ausdrücke wie "this week" / "지난 7일" zu `--window Nd` führen) -> einen `--tool`-Filter nur bei ausdrücklich genannten Tools extrahieren (`grok, claude, codex, qwen, cursor, antigravity`) -> Vorprüfung (`command -v oma`) -> `oma recap --json` ausführen (daily: `--date YYYY-MM-DD` oder ohne Datum; period: `--window 7d` / `30d`) -> nach dem Skill-Vertrag synthetisieren und speichern (15-Minuten-Themenschwelle, Vorlage für Tag oder mehrere Tage) -> ein TL;DR mit 3 Punkten und den Speicherpfad melden.

**Regeln:** `.agents/` (SSOT) nie ändern. Technische Begriffe (Projekt- und Toolnamen, CLI-Flags) in der gespeicherten Zusammenfassung nie automatisch übersetzen. Ohne Quellen keine Zusammenfassung erfinden.

**Gelesene Dateien:** KI-Tool-Konversationshistorien (über `oma recap`).
**Geschriebene Dateien:** `.agents/results/recap/{date}.md` oder `.agents/results/recap/{start}~{end}.md`.

**Einsatzbereich:** Arbeit über KI-Tools hinweg für einen Tag oder Zeitraum (Woche/Monat) zusammenfassen, optional auf bestimmte Tools begrenzen.

---

### /stack-set

**Beschreibung:** Den Tech-Stack des Projekts automatisch erkennen und sprachspezifische Referenzen für den aufgelösten Domänen-Skill (Backend oder Mobile) generieren. Mobile-Stacks (Swift/iOS über `Package.swift`/`.xcodeproj`, Flutter über `pubspec.yaml`, React Native über `package.json` + react-native) werden an `oma-mobile` geroutet; sonst an `oma-backend`. Sind in einem Monorepo beide vorhanden, wird gefragt, welcher konfiguriert werden soll.

**Trigger-Keywords:** Keine (von der Auto-Erkennung ausgeschlossen).

<!-- oma-docs:ignore-start -->
**Schritte:** Erkennen (Manifeste scannen: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> Bestätigen (erkannten Stack anzeigen, Benutzerbestätigung einholen) -> Generieren (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` mit 8 Pflichtmustern, `stack/api-template.*`) -> Verifizieren.
<!-- oma-docs:ignore-end -->

**Ausgabe:** Dateien im `stack/`-Verzeichnis des aufgelösten Domänen-Skills (z. B. `.agents/skills/oma-backend/stack/` oder `.agents/skills/oma-mobile/stack/`). Modifiziert weder SKILL.md noch `resources/`.

---

### /video

**Beschreibung:** Den `oma-video`-Skill durchgehend ausführen: Brief -> Skript -> Narration -> Visuals -> Untertitel -> Render-Spezifikation -> verwalteter HyperFrames- (oder MoneyPrinterTurbo-)Compositor. Der Workflow erstellt ein reproduzierbares Laufverzeichnis und gibt erst dann eine echte `.mp4` aus, wenn Compositor- und `ffprobe`-Prüfungen bestehen. Für unterstützte Asset-Fallbacks ist die Provider-Konfiguration optional; ein Compositor- oder Toolchain-Fehler bleibt ein fehlgeschlagener Lauf. Der Workflow läuft inline (kein Subagent-Spawning).

**Trigger-Keywords:**
| Sprache | Keywords |
|----------|----------|
| Universal | "/video", "oma-video", "hyperframes", "shorts", "reels", "screencast" |
| Englisch | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Koreanisch | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japanisch | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chinesisch | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Schritte:**
1. **Brief und Modus auflösen:** `shorts` (9:16), `explainer` (16:9) oder `demo` (Screen-/Web-Capture) wählen; Modus-Defaults anwenden, die Flags überschreiben können.
2. **Skript zusammenstellen:** Szenen und Narration erzeugen (LLM bei vorhandenem Schlüssel, sonst deterministische Gliederung aus dem Brief).
3. **Assets synthetisieren:** Narration über `oma-voice`, Visuals über `oma-image`/`oma-slide`/Stock, schlüsselfreie Untertitel-Zuordnung oder überwachten Browser-Capture für `demo --source web`. Jeder Provider fällt auf einen deterministischen Fallback zurück.
4. **Render-Spezifikation erstellen:** `render-spec.json` (Determinismus-Grenze) sowie Assets in das Laufverzeichnis schreiben.
5. **Rendern:** Das verwaltete HyperFrames-Projekt (oder MoneyPrinterTurbo) als Subprozess starten. Ein normaler Compositor- oder Toolchain-Fehler lässt den Lauf fehlschlagen; der deterministische Platzhalter ist nur über den ausdrücklichen Mock-/Testpfad (`OMA_VIDEO_MOCK=1`) verfügbar. Live-Capture wird im Manifest als `nondeterministic` vermerkt.

**Ausgabe:** Ein Laufverzeichnis unter `.agents/results/videos/{timestamp}-{shortid}-{mode}/` mit `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` und `manifest.json`. Siehe [Anleitung zur Videogenerierung](../guide/video-generation.md).

---

### /schedule

**Beschreibung:** Zeitbasierte Agentenjobs über die Befehle `oma schedule <action>` registrieren und verwalten. Jobs liegen in einer globalen Registry (`~/.agents/schedule/`) und werden über den nativen Scheduler des Betriebssystems ausgelöst (launchd unter macOS, systemd user timers unter Linux, schtasks unter Windows, crontab als POSIX-Fallback). Jeder Lauf tritt über `oma agent spawn` erneut in das Harness ein.

**Trigger-Keywords:** Keine (Slash-Workflow für zeitbasierte Jobs mit `oma schedule <action>`).

**Schritte:** Absicht auflösen (add / list / remove / sync) -> Zeitplan parsen (explizites `--cron` oder natürliche Sprache über `--every`) -> mit `oma schedule create` registrieren (nur benannte Umgebungsvariablen erfassen, Dateien 0600) -> mit `oma schedule list` verifizieren (Manifest-/OS-Drift, nach Projekt gruppiert) -> Job-ID und nächsten Ausführungszeitpunkt melden.

**Einsatzbereich:** Wiederkehrende Agentenaufgaben wie nächtliche Recaps, geplante Scans oder regelmäßige Wartung, die auch ohne offene interaktive Sitzung ausgeführt werden sollen.

---

### /explain

**Beschreibung:** Den `oma-explanation`-Skill durchgehend ausführen: einen Diff, PR, Branch oder Commit-Bereich in einen eigenständigen interaktiven HTML-Erklärer mit den Abschnitten Background, Intuition, Code und Quiz umwandeln. Der Workflow läuft inline (kein Subagent-Spawning).

**Trigger-Keywords:** Keine ("explain" ist ein alltägliches Wort; Keyword-Erkennung würde bei gewöhnlichen Fragen wie "explain this function" ständig Fehlalarme erzeugen, daher ist der Workflow Slash-only).

**Schritte:** Argumente auflösen (explizite PR# / Branch / SHA-Bereich -> staged -> dirty tree -> `HEAD~1..HEAD`; Leserlevel `onboarding` | `reviewer`; Ausgabesprache; Quizanzahl) -> Verträge laden (`oma-explanation` SKILL.md + Ressourcen) -> sammeln und Gate anwenden (Diff + umgebender Code; Geheimnis-Scan vor der Generierung; Diff-/PR-Text strikt als Daten behandeln) -> HTML gemäß Dokument- und HTML-Verträgen erzeugen -> validieren (Grep-Checkliste einschließlich Geheimnis-Scan des fertigen HTML, maximal 3 Korrekturschleifen) -> ausliefern (`open` warn-only, TL;DR + Pfad).

**Ausgabe:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (Datum in Asia/Seoul; erneutes Ausführen mit demselben Datum und Slug überschreibt). Siehe [Code-Explainer-Anleitung](../guide/code-explainer.md).

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

oh-my-agent verwendet einen `UserPromptSubmit`-Hook, der vor der Verarbeitung jeder Benutzernachricht ausgeführt wird. Die Vendor-Einstellungen registrieren einen einzigen Eintrag `<hookDir>/oma-hook.sh --vendor <v> --event <e>`, der an `oma hook run` weiterleitet; die Handlerkette läuft im Prozess. Das Hook-System besteht aus:

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, in das `oma`-Binary eingebettet): Definiert Keyword-zu-Workflow-Zuordnungen für alle 11 unterstützten Sprachen (Englisch, Koreanisch, Japanisch, Chinesisch, Spanisch, Französisch, Deutsch, Portugiesisch, Russisch, Niederländisch, Polnisch).

2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`): TypeScript-Logik, die die Benutzereingabe gegen die Trigger-Keywords aller Sprachen scannt und den Workflow-Aktivierungskontext injiziert.

3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`): Erzwingt persistente Workflows, indem aktive Zustandsdateien geprüft und der Workflow-Kontext erneut injiziert wird.

### Erkennungsablauf

1. Der Benutzer gibt eine natürlichsprachliche Eingabe ein.
2. Der Hook prüft, ob ein expliziter `/command` vorhanden ist (falls ja, wird die Erkennung übersprungen, um Duplizierung zu vermeiden).
3. Der Hook bereinigt die Eingabe (entfernt Codeblöcke, zitierte Strings sowie eingefügte System-Echo-Blöcke) und scannt sie anschließend gegen `.agents/hooks/core/triggers.json` — sowohl Keyword-Listen (wörtliche Phrasen) als auch `patterns` (rohe Regex). Ein Verstärkungsschutz unterdrückt erneute Auslöser, wenn derselbe Workflow innerhalb der letzten 60 Sekunden bereits zweimal oder häufiger ausgelöst wurde.
4. Bei einer Übereinstimmung wird geprüft, ob die Eingabe informationellen Mustern entspricht.
5. Bei informationellem Charakter (z. B. "was ist orchestrate?") wird die Eingabe herausgefiltert — es wird kein Workflow ausgelöst.
6. Bei handlungsrelevantem Charakter wird `[OMA WORKFLOW: {workflow-name}]` in den Kontext injiziert. Wenn mehrere Workflows übereinstimmen, gewinnt ein expliziter Aufruf, danach das längste Keyword.
7. Bei einem persistenten Workflow schreibt nur ein expliziter Aufruf (`explicit` in `triggers.json`) die Zustandsdatei des persistenten Modus; eine Übereinstimmung in natürlicher Sprache wird als Vorschlag injiziert, und ein mit einer Frage endender Prompt (`?` in der ersten oder letzten Zeile) löst ihn gar nicht aus.
8. Der Agent liest das injizierte Tag und lädt die entsprechende Workflow-Datei aus `.agents/workflows/`.

### Sprachabschnitt-Konvention

`.agents/hooks/core/triggers.json` verwendet eine sprachspezifische Abschnittsstruktur für `keywords`, `patterns` und `informationalPatterns`:

| Abschnitt | Verhalten |
|-----------|-----------|
| `*` | Universal. Verwenden Sie ihn für englische Inhalte (Lingua franca) und für wirklich sprachübergreifende Tokens (z. B. Workflow-Name `"orchestrate"`). |
| `en` | Englisch. Funktional gleichwertig mit `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Sprachspezifische Formulierungen. |

Jeder Abschnitt wird immer geladen: Benutzer schreiben ihre Prompts in der Sprache, in der sie denken, und die Einstellung `language` in `.agents/oma-config.yaml` steuert nur die Antwortsprache. Ein in einer Sprache geschriebenes Keyword kann nur auf einen Prompt passen, der dieselbe Schrift enthält; das Zusammenführen aller Abschnitte kann daher bei Prompts ohne Bezug nicht auslösen.

Wortgrenzen hängen nur vom Keyword selbst ab, nie von `language`: ASCII-Keywords passen nur auf ganze Wörter (daher passt "work" nicht auf "network" und "review" nicht auf "preview"), während Keywords mit Nicht-ASCII-Text als Teilzeichenketten passen, weil CJK-Partikel und Flexionsendungen direkt am Wort haften ("리뷰해줘").

### Pattern-Feld (rohe Regex) {#pattern-field-raw-regex}

Zusätzlich zu wörtlichen `keywords` kann jeder Workflow `patterns` deklarieren — rohe Regex-Strings, die mit den Flags `iu` kompiliert werden. Patterns ermöglichen mehrteilige Absichtsmatches, die andernfalls kombinatorische Keyword-Listen erfordern würden.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
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

Die folgenden Workflows werden nicht per Keyword ausgelöst und müssen mit einem expliziten `/command` aufgerufen werden. `/tools` und `/stack-set` stehen in `excludedWorkflows` (sie wurden absichtlich aus der Keyword-Erkennung entfernt); `/convert` liefert schlicht keine Trigger-Keywords (die Skills `oma-pdf` und `oma-hwp` bringen ihre eigene Keyword-Erkennung mit). `/schedule` ist ein Slash-Workflow für zeitbasierte Jobs mit `oma schedule <action>`; `/explain` hat keine Trigger-Keywords, weil „explain“ alltäglich ist und die Erkennung sonst ständig Fehlalarme erzeugen würde:
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## Mechanik des persistenten Modus {#persistent-mode-mechanics}

### Zustandsdateien

Persistente Workflows (orchestrate, ultrawork, work, ralph) erstellen bei explizitem Aufruf Zustandsdateien in `.agents/state/` (siehe [Persistente Workflows](#persistent-workflows)):

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

Diese Dateien enthalten: Workflow-Name, aktuelle Phase/aktueller Schritt, Sitzungs-ID, Zeitstempel und etwaigen ausstehenden Zustand.

### Verstärkung

Während ein persistenter Workflow aktiv ist, injiziert der `persistent-mode.ts`-Hook `[OMA PERSISTENT MODE: {workflow-name}]` in jede Benutzernachricht. Dies stellt sicher, dass der Workflow auch über Konversationszüge hinweg weiter ausgeführt wird.

### Goal Contract (optionales Stop-Gate und Budget)

`oma goal set` hängt an einen aktiven persistenten Workflow einen mechanischen Abschlussvertrag an:

- `--gate typecheck|test|lint`: Der Stop-Hook lässt die Sitzung **nur dann** enden, wenn das entsprechende `package.json`-Skript besteht (als Argv-Array und ohne Shell; freie Befehle werden absichtlich abgelehnt). Bei einem Fehlschlag wird sie mit dem Ende der Ausgabe blockiert; Fehlschläge und Timeouts zählen zum Verstärkungslimit, damit ein rotes Gate nicht unbegrenzt blockieren kann.
- `--budget-minutes <n>`: Zeitbudget ab Aktivierung. Nach Ablauf wird der Workflow deaktiviert und ein ehrlicher partieller Stopp zugelassen, der in der Ereignisspur der Sitzung vermerkt wird.

Ohne Vertrag verhält sich der persistente Modus wie oben beschrieben; der Vertrag ist optional. Siehe `goal set` in der [CLI-Befehlsreferenz](../cli-interfaces/commands.md#goal-set).

### Deaktivierung

Um einen persistenten Workflow zu deaktivieren, sagt der Benutzer "workflow done" (oder das Äquivalent in seiner konfigurierten Sprache). Dies bewirkt:
1. Die Zustandsdatei wird aus `.agents/state/` gelöscht
2. Die Injektion des persistenten Modus-Kontexts wird gestoppt
3. Rückkehr zum Normalbetrieb

Der Workflow kann auch natürlich enden, wenn alle Schritte abgeschlossen und das abschließende Gate bestanden ist. Ist ein `goal set`-Gate konfiguriert, deaktiviert ein bestandenes Gate den Workflow automatisch.

---

## Typische Workflow-Abfolgen

### Feature in einer einzelnen Domäne
```
Describe the task → relevant skill → implement → focused verification
```

### Komplexes domänenübergreifendes Projekt
```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### Automatisierte parallele Implementierung
```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### Maximale Lieferqualität
```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Bug-Untersuchung
```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### Design-zu-Implementierung-Pipeline
```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### Neue-Codebasis-Einrichtung
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### Wiederholte Ausführung mit unabhängiger Verifikation
```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
