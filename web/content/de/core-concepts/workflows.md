---
title: Workflows
description: Vollständige Referenz aller 14 oh-my-agent-Workflows — Slash-Befehle, persistenter vs. nicht-persistenter Modus, Trigger-Keywords in 11 Sprachen, Phasen und Schritte, gelesene und geschriebene Dateien, Auto-Erkennung-Mechanik und Zustandsverwaltung des persistenten Modus.
---

# Workflows

Workflows sind strukturierte mehrstufige Prozesse, die durch Slash-Befehle oder natürlichsprachliche Keywords ausgelöst werden. Sie definieren, wie Agenten bei Aufgaben zusammenarbeiten — von einphasigen Hilfsprogrammen bis hin zu komplexen 5-Phasen-Qualitäts-Gates.

Es gibt 14 Workflows, von denen 3 persistent sind (sie halten den Zustand und können nicht versehentlich unterbrochen werden).

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

**Schritte:**
1. **Schritt 0 — Vorbereitung:** Koordinations-Skill, Context-Loading-Leitfaden, Memory-Protokoll lesen. Vendor erkennen.
2. **Schritt 1 — Plan laden/erstellen:** Auf `.agents/plan.json` prüfen. Falls nicht vorhanden, Benutzer auffordern, zuerst `/plan` auszuführen.
3. **Schritt 2 — Sitzung initialisieren:** `oma-config.yaml` laden, CLI-Zuordnungstabelle anzeigen, Sitzungs-ID generieren (`session-YYYYMMDD-HHMMSS`), `orchestrator-session.md` und `task-board.md` im Memory erstellen.
4. **Schritt 3 — Agenten starten:** Für jede Prioritätsstufe (P0 zuerst, dann P1...) Agenten mit der vendor-geeigneten Methode starten (Agent-Tool für Claude Code, `oma agent:spawn` für Gemini/Antigravity, modellvermittelt für Codex). MAX_PARALLEL niemals überschreiten.
5. **Schritt 4 — Überwachen:** `progress-{agent}.md`-Dateien abfragen, `task-board.md` aktualisieren. Auf Abschlüsse, Fehler und Abstürze achten.
6. **Schritt 5 — Verifizieren:** `verify.sh {agent-type} {workspace}` pro abgeschlossenem Agenten ausführen. Bei Fehlschlag mit Fehlerkontext erneut starten (max. 2 Wiederholungen). Nach 2 Wiederholungen Explorationsschleife aktivieren: 2-3 Hypothesen generieren, parallele Experimente starten, bewerten, bestes beibehalten.
7. **Schritt 6 — Zusammentragen:** Alle `result-{agent}.md`-Dateien lesen, Zusammenfassung zusammenstellen.
8. **Schritt 7 — Abschlussbericht:** Sitzungszusammenfassung präsentieren. Falls die Qualitätsbewertung gemessen wurde, Experimentprotokoll-Zusammenfassung einbeziehen und automatisch Erkenntnisse generieren.

**Gelesene Dateien:** `.agents/plan.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
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
3. **Schritt 2 — PM-Agent-Planung:** PM zerlegt Anforderungen, definiert API-Verträge, erstellt priorisierte Aufgabenaufschlüsselung, speichert in `.agents/plan.json`.
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

**Ausgabe:** `.agents/plan.json`, Memory-Eintrag, optional `docs/exec-plans/active/` für komplexe Pläne.

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

### /commit

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

1. Benutzer gibt natürlichsprachliche Eingabe ein
2. Hook prüft, ob ein expliziter `/command` vorhanden ist (falls ja, Erkennung überspringen, um Duplizierung zu vermeiden)
3. Hook scannt Eingabe gegen `triggers.json`-Keyword-Listen
4. Bei Übereinstimmung wird geprüft, ob die Eingabe informationellen Mustern entspricht
5. Bei informationellem Charakter (z. B. "was ist orchestrate?") herausfiltern — kein Workflow wird ausgelöst
6. Bei handlungsrelevantem Charakter `[OMA WORKFLOW: {workflow-name}]` in den Kontext injizieren
7. Der Agent liest das injizierte Tag und lädt die entsprechende Workflow-Datei aus `.agents/workflows/`

### Filterung informationeller Muster

Der Abschnitt `informationalPatterns` in `triggers.json` definiert Phrasen, die auf Fragen statt Befehle hindeuten. Diese werden vor der Workflow-Aktivierung geprüft:

| Sprache | Informationelle Muster |
|----------|----------------------|
| Englisch | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Koreanisch | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japanisch | "とは", "って何", "どうやって", "説明して" |
| Chinesisch | "是什么", "什么是", "怎么", "解释" |

Wenn die Eingabe sowohl einem Workflow-Keyword als auch einem informationellen Muster entspricht, hat das informationelle Muster Vorrang und es wird kein Workflow ausgelöst.

### Ausgeschlossene Workflows

Die folgenden Workflows sind von der Auto-Erkennung ausgeschlossen und müssen mit einem expliziten `/command` aufgerufen werden:
- `/commit`
- `/tools`
- `/stack-set`
- `/exec-plan`

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
/brainstorm → Designdokument → /plan → Aufgabenzerlegung → /orchestrate → parallele Implementierung → /review → /commit
```

### Neue-Codebasis-Einrichtung
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
