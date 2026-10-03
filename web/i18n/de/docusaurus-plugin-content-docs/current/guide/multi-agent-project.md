---
title: "Anleitung: Multi-Agenten-Projekte"
sidebar_label: Multi-Agenten-Projekte
description: Vollständige Anleitung zur Koordination mehrerer Domänenagenten über Frontend, Backend, Datenbank, Mobile und QA von der Planung bis zum Merge.
---

# Anleitung: Multi-Agenten-Projekte

## Wann Multi-Agenten-Koordination einsetzen

Ihr Feature umfasst mehrere Domänen — Backend-API + Frontend-UI + Datenbankschema + Mobile-Client + QA-Review. Ein einzelner Agent kann den gesamten Umfang nicht bewältigen, und die Domänen müssen parallel vorankommen, ohne gegenseitig in die Dateien des anderen einzugreifen.

Multi-Agenten-Koordination ist die richtige Wahl, wenn:

- Die Aufgabe 2 oder mehr Domänen umfasst (Frontend, Backend, Mobile, DB, QA, Debug, PM).
- API-Verträge zwischen den Domänen bestehen (z. B. ein REST-Endpunkt, der sowohl von Web als auch Mobile konsumiert wird).
- Sie parallele Ausführung wünschen, um die Gesamtdauer zu verkürzen.
- Sie nach der Implementierung ein QA-Review über alle Domänen hinweg benötigen.

Passt Ihre Aufgabe vollständig in eine Domäne, verwenden Sie stattdessen den spezifischen Agenten direkt.

---

## Die vollständige Abfolge: /plan bis /review

Der empfohlene Multi-Agenten-Workflow folgt einer strikten vierstufigen Pipeline.

### Schritt 1: /plan — Anforderungen und Aufgabenzerlegung

Der `/plan`-Workflow läuft inline (kein Subagenten-Spawning) und erzeugt einen strukturierten Plan.

```
/plan
```

Was passiert:

1. **Anforderungen erfassen** — Der PM-Agent fragt nach Zielgruppen, Kernfunktionen, Einschränkungen und Deployment-Zielen.
2. **Technische Machbarkeit analysieren** — Verwendet den konfigurierten Code-Intelligence-Anbieter, um die vorhandene Codebasis nach wiederverwendbarem Code und Architekturmustern zu scannen. Native Suche ist nur für Pfade außerhalb des Projekts oder für ignorierte Pfade vorgesehen.
3. **API-Verträge definieren** — Entwirft Endpunkt-Verträge (Methode, Pfad, Anfrage-/Antwort-Schemata, Auth, Fehlerantworten) und speichert sie in `.agents/results/api-contracts/` (Laufartefakte); dauerhafte Spezifikationen werden beim Commit nach `docs/plans/contracts/` übernommen.
4. **In Aufgaben zerlegen** — Zerlegt das Projekt in umsetzbare Aufgaben, jeweils mit: zugewiesenem Agenten, Titel, Akzeptanzkriterien, Priorität (P0-P3) und Abhängigkeiten.
5. **Plan mit Benutzer prüfen** — Präsentiert den vollständigen Plan zur Bestätigung. Der Workflow fährt ohne explizite Benutzergenehmigung nicht fort.
6. **Plan speichern** — Schreibt den genehmigten Plan nach `.agents/results/plan-{sessionId}.json` und zeichnet eine Zusammenfassung im Memory auf.

Die Ausgabe `.agents/results/plan-{sessionId}.json` ist die Eingabe für sowohl `/work` als auch `/orchestrate`.

### Schritt 2: /work oder /orchestrate — Ausführung

Es gibt zwei Ausführungspfade:

| Aspekt | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interaktion** | Interaktiv — Benutzer bestätigt bei jeder Stufe | Automatisiert — läuft bis zum Abschluss |
| **PM-Planung** | Eingebaut (Schritt 2 führt PM-Agent aus) | Lädt einen vorhandenen Plan; wenn keiner verwendbar ist, wird inline einer erstellt |
| **Benutzer-Checkpoint** | Nach Plan-Review (Schritt 3) | Der Inline-Plan durchläuft vor dem Fan-out weiterhin das Review-Gate |
| **Persistenter Modus** | Ja — kann bis zum Abschluss nicht beendet werden | Ja — kann bis zum Abschluss nicht beendet werden |
| **Am besten für** | Erstmalige Nutzung, komplexe Projekte mit Aufsichtsbedarf | Wiederholte Läufe, klar definierte Aufgaben |

#### /work — Interaktive Multi-Agenten-Pipeline

```
/work
```

1. Analysiert die Benutzeranfrage und identifiziert beteiligte Domänen.
2. Führt den PM-Agenten zur Aufgabenzerlegung aus (erstellt plan-\{sessionId\}.json).
3. Präsentiert den Plan zur Benutzerbestätigung — **blockiert bis zur Bestätigung**.
4. Startet Agenten nach Prioritätsstufe (P0 zuerst, dann P1 usw.), wobei Aufgaben gleicher Priorität parallel laufen.
5. Überwacht den Agentenfortschritt über Memory-Dateien.
6. Führt QA-Agent-Review aller Ergebnisse durch (OWASP Top 10, Performance, Barrierefreiheit, Code-Qualität).
7. Bei CRITICAL- oder HIGH-Problemen wird der zuständige Agent mit QA-Befunden erneut gestartet. Bis zu 2 Wiederholungen pro Problem. Besteht dasselbe Problem weiter, wird die **Explorationsschleife** aktiviert — 2-3 alternative Ansätze werden generiert, derselbe Agententyp wird mit verschiedenen Hypothesen-Prompts in separaten Workspaces gestartet, QA bewertet jeden, und das beste Ergebnis wird übernommen.

#### /orchestrate — Automatisierte parallele Ausführung

```
/orchestrate
```

1. Lädt `.agents/results/plan-{sessionId}.json` und erstellt inline über `/plan` einen Plan, wenn kein verwendbarer Plan vorhanden ist.
2. Initialisiert eine Sitzung mit ID-Format `session-YYYYMMDD-HHMMSS`.
3. Erstellt `orchestrator-session.md` und `task-board.md` im Memory-Verzeichnis.
4. Startet Agenten pro Prioritätsstufe, jeweils mit: Aufgabenbeschreibung, API-Verträgen und Kontext.
5. Überwacht den Fortschritt durch Abfrage der `progress-{agent}.md`-Dateien.
6. Verifiziert jeden abgeschlossenen Agenten über `verify.sh` — PASS (Exit-Code 0) akzeptiert, FAIL (Exit-Code 1) startet mit Fehlerkontext erneut (max. 2 Wiederholungen), dauerhaftes Scheitern löst die Explorationsschleife aus.
7. Sammelt alle `result-{agent}.md`-Dateien und erstellt einen Abschlussbericht.

### Schritt 3: agent spawn — CLI-Agenten-Verwaltung

Der `agent spawn`-Befehl ist der Low-Level-Mechanismus, den Workflows intern aufrufen. Sie können ihn auch direkt verwenden:

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Alle Flags:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--vendor <vendor>` | CLI-Vendor-Überschreibung (antigravity/claude/codex/cursor/opencode/qwen/grok/pi). Überschreibt die Modellauflösung für diesen Spawn. |
| `-w, --workspace <path>` | Arbeitsverzeichnis für den Agenten. Automatisch aus Monorepo-Konfiguration erkannt, wenn nicht angegeben. |
| `--task-id <id>` | Bindet den Spawn an eine Aufgabe im Sitzungsplan; Standard ist die Agenten-ID. |
| `--isolation worktree` | Erstellt einen Git-Worktree für den Spawn; standardmäßig gibt es keine zusätzliche Isolation. |
| `--read-only` | Beschränkt das Kind auf Inspektionswerkzeuge und unterdrückt Auto-Approve-Flags. |

**Vendor-Auflösungsreihenfolge** (der erste Treffer gewinnt):

1. `--vendor`-Flag auf der Kommandozeile
2. `agents:`-Überschreibung in `oma-config.yaml` für diesen Agenten
3. Aktive `model_preset`-Agentenstandards

Details zur Konfiguration finden Sie unter [Modelle pro Agent](./per-agent-models.md).

**Automatische Workspace-Erkennung** prüft Monorepo-Konfigurationen in dieser Reihenfolge: pnpm-workspace.yaml, package.json Workspaces, lerna.json, nx.json, turbo.json, mise.toml. Jedes Workspace-Verzeichnis wird gegen Agententyp-Keywords bewertet (z. B. "web", "frontend", "client" für den Frontend-Agenten). Ohne Monorepo-Konfiguration werden fest codierte Kandidaten wie `apps/web`, `apps/frontend`, `frontend/` usw. geprüft.

**Prompt-Auflösung:** Das `<prompt>`-Argument kann entweder Inline-Text oder ein Dateipfad sein. Wird der Pfad als vorhandene Datei aufgelöst, wird deren Inhalt als Prompt verwendet. Die CLI injiziert zudem vendor-spezifische Ausführungsprotokolle aus `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Schritt 4: /review — QA-Verifikation

```
/review
```

Der Review-Workflow führt eine vollständige QA-Pipeline durch:

1. **Umfang identifizieren** — Fragt, was geprüft werden soll (bestimmte Dateien, Feature-Branch oder gesamtes Projekt).
2. **Automatisierte Sicherheitsprüfungen** — Führt `npm audit`, `bandit` oder Äquivalent aus.
3. **OWASP Top 10 manuelles Review** — Injection, defekte Auth, sensible Daten, Zugriffskontrolle, Fehlkonfiguration, unsichere Deserialisierung, verwundbare Komponenten, unzureichendes Logging.
4. **Performance-Analyse** — N+1-Abfragen, fehlende Indizes, unbegrenzte Paginierung, Speicherlecks, unnötige Re-Renders, Bundle-Größen.
5. **Barrierefreiheit** — WCAG 2.1 AA: semantisches HTML, ARIA, Tastaturnavigation, Farbkontrast, Fokusverwaltung.
6. **Code-Qualität** — Benennung, Fehlerbehandlung, Testabdeckung, TypeScript Strict Mode, unbenutzte Imports, async/await-Muster.
7. **Bericht** — Befunde kategorisiert als CRITICAL / HIGH / MEDIUM / LOW mit `file:line`, Beschreibung und Behebungscode.

Für große Scopes wird an den QA-Agent-Subagenten delegiert. Mit der `--fix`-Option wird eine Fix-Verify-Schleife gestartet: Domänenagenten zur Behebung von CRITICAL-/HIGH-Problemen starten, erneut prüfen, bis zu 3-mal wiederholen.

---

## Sitzungs-ID-Strategie

Jede Orchestrierungssitzung erhält eine eindeutige Kennung im Format:

```
session-YYYYMMDD-HHMMSS
```

Beispiel: `session-20260324-143052`

Die Sitzungs-ID wird verwendet, um:

- Memory-Dateien zu benennen (`orchestrator-session.md`, `task-board.md`)
- Agentenprozesse über PID-Dateien im System-Temp-Verzeichnis zu verfolgen (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- Logdateien zuzuordnen (`/tmp/subagent-{session-id}-{agent-id}.log`)
- Ergebnisse in `.agents/results/parallel-{timestamp}/` zu gruppieren

Die Sitzungs-ID wird in Schritt 2 von `/orchestrate` generiert und an alle gestarteten Agenten übergeben. Dies stellt sicher, dass alle Agenten, Logs und PID-Dateien eines einzelnen Laufs auf eine Sitzung zurückverfolgt werden können.

---

## Workspace-Zuweisung pro Domäne

Jeder Agent wird in einem isolierten Workspace-Verzeichnis gestartet, um Dateikonflikte zu verhindern. Die Zuweisung folgt diesen Regeln:

### Automatische Erkennung

Wenn `-w` nicht angegeben ist (oder auf `.` gesetzt), erkennt die CLI den besten Workspace durch:

1. Scannen von Monorepo-Konfigurationsdateien (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Erweitern von Glob-Mustern (z. B. `apps/*`) in tatsächliche Verzeichnisse.
3. Bewertung jedes Verzeichnisses gegen Agententyp-Keywords:

| Agententyp | Keywords (in Prioritätsreihenfolge) |
|:-----------|:---------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. Exakter Verzeichnisname-Treffer bewertet 100, enthält-Keyword bewertet 50, Pfad-enthält bewertet 25.
5. Das Verzeichnis mit der höchsten Bewertung gewinnt.

### Fallback-Kandidaten

Ohne Monorepo-Konfiguration prüft die CLI fest codierte Pfade der Reihe nach:

- **Frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **Backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **Mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

Ohne Treffer läuft der Agent im aktuellen Verzeichnis (`.`).

### Explizite Überschreibung

Immer verfügbar:

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Contract-First-Regel

API-Verträge sind der Synchronisierungsmechanismus zwischen Agenten. Die Contract-First-Regel bedeutet:

1. **Verträge werden definiert, bevor die Implementierung beginnt.** Schritt 3 des `/plan`-Workflows erzeugt API-Verträge, die in `.agents/results/api-contracts/` gespeichert werden (oder in `docs/plans/contracts/` für dauerhafte Spezifikationen).

2. **Jeder Agent erhält seine relevanten Verträge als Kontext.** Wenn `/orchestrate` Agenten in Schritt 3 startet, erhält jeder Agent "Aufgabenbeschreibung, API-Verträge, relevanter Kontext."

3. **Verträge definieren die Schnittstellengrenze.** Ein Vertrag spezifiziert:
   - HTTP-Methode und Pfad
   - Request-Body-Schema (mit Typen)
   - Response-Body-Schema (mit Typen)
   - Authentifizierungsanforderungen
   - Fehlerantwortformate

4. **Vertragsverletzungen werden während der Überwachung erkannt.** Schritt 5 von `/work` verwendet den konfigurierten Code-Intelligence-Anbieter, um die API-Vertrags-Übereinstimmung zwischen Agenten zu verifizieren. Native Suche ist nur für Pfade außerhalb des Projekts oder für ignorierte Pfade vorgesehen.

5. **QA-Review prüft die Vertragseinhaltung.** Das Alignment-Review des QA-Agenten (Schritt 6 in ultrawork) vergleicht explizit die Implementierung mit dem Plan, einschließlich der API-Verträge.

Ohne Verträge könnte ein Backend-Agent `{ "user_id": 1 }` zurückgeben, während der Frontend-Agent `{ "userId": 1 }` erwartet. Die Contract-First-Regel verhindert diese Art von Integrationsfehlern.

---

## Merge-Gates: 4 Bedingungen

Bevor eine Multi-Agenten-Arbeit als abgeschlossen gilt, müssen vier Bedingungen erfüllt sein:

### 1. Deklarierte Prüfungen erfolgreich

Jedes Akzeptanzkriterium hat eine passende Prüfung, und die im Plan deklarierten Prüfungen bestehen. Ein Build ist nur enthalten, wenn das Projekt-Gate der Aufgabe ihn verlangt; der Ergebnisvertrag zeichnet die tatsächlich ausgeführten Argumente und den Exit-Code auf.

### 2. Tests bestehen

Alle vorhandenen Tests bestehen weiterhin, und neue Tests decken die implementierte Funktionalität ab. Der QA-Agent prüft die Testabdeckung als Teil seines Code-Qualitäts-Reviews.

### 3. Nur geplante Dateien modifiziert

Agenten dürfen keine Dateien außerhalb ihres zugewiesenen Scopes modifizieren. Der Verifikationsschritt prüft, dass nur aufgabenbezogene Dateien geändert wurden. Dies verhindert unbeabsichtigte Seiteneffekte in gemeinsam genutztem Code.

### 4. QA-Review fehlerfrei

Keine CRITICAL- oder HIGH-Befunde verbleiben aus dem Review des QA-Agenten. MEDIUM- und LOW-Befunde können für zukünftige Sprints dokumentiert werden, aber Blocker müssen behoben werden.

Im ultrawork-Workflow übersetzen sich diese in explizite **Phasen-Gates** (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) mit Checklisten-Kriterien, die alle bestanden werden müssen, bevor es weitergeht.

---

## Spawn-Beispiele

### Einzelner Agent-Spawn

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Parallele Ausführung über agent parallel

Mit einer YAML-Aufgabendatei:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent parallel tasks.yaml
```

Im Inline-Modus:

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Hintergrundmodus (kein Warten):

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

Mit Vendor-Überschreibung:

```bash
oma agent parallel tasks.yaml --vendor claude
```

---

## Zu vermeidende Anti-Patterns

### 1. Den Plan unkritisch abnicken

`/orchestrate` kann über `/plan` inline einen Plan erstellen, wenn keine verwendbare Plandatei vorhanden ist. Dieser Inline-Plan durchläuft weiterhin das Review-Gate von `/plan`, und der Fan-out folgt in Schritt 2 der bestätigten Zerlegung. Bei umfangreicher domänenübergreifender Arbeit sollte `/plan` vorher ausgeführt werden, damit ein dauerhafter Tracker unter `docs/plans/work/` verfügbar ist und die Zerlegung vor dem Agenten-Spawn verfeinert werden kann.

### 2. Überlappende Workspaces

Zwei Agenten demselben Workspace-Verzeichnis zuweisen. Dies verursacht Dateikonflikte — die Änderungen eines Agenten überschreiben die des anderen. Immer separate Workspace-Verzeichnisse verwenden.

### 3. Fehlende API-Verträge

Backend- und Frontend-Agenten starten, ohne vorher Verträge zu definieren. Sie werden inkompatible Annahmen über Datenformate, Feldnamen und Fehlerbehandlung machen.

### 4. QA-Befunde ignorieren

QA-Review als optional behandeln. CRITICAL- und HIGH-Befunde repräsentieren echte Bugs, die in der Produktion auftreten werden. Der Workflow erzwingt dies durch Schleifen, bis keine Blocker mehr vorhanden sind.

### 5. Manuelle Datei-Koordination

Versuchen, Agentenausgaben manuell zusammenzuführen, statt die Verifikations- und QA-Pipeline die Integration handhaben zu lassen. Die automatisierte Pipeline erkennt Probleme, die manuelle Prüfung übersieht.

### 6. Über-Parallelisierung

P1-Aufgaben vor Abschluss der P0-Aufgaben ausführen. Prioritätsstufen existieren, weil P1-Aufgaben oft von P0-Ausgaben abhängen. Die Workflows erzwingen die Stufenreihenfolge automatisch.

### 7. Verifikation überspringen

`agent spawn` direkt verwenden, ohne danach den Ergebnisvertrag zu erfassen. Führen Sie die für die Aufgabe deklarierten Prüfungen aus und schließen Sie einen strukturierten Claim ab; siehe [Agentenergebnisse und Fortsetzung](/docs/guide/agent-results-and-resume). Der Verifikationsschritt erkennt anschließend fehlgeschlagene Prüfungen und Scope-Abweichungen, bevor Ergebnisse wiederverwendet werden.

---

## Domänenübergreifende Integrationsvalidierung

Nachdem alle Agenten ihre individuellen Aufgaben abgeschlossen haben, muss die domänenübergreifende Integration validiert werden:

1. **API-Vertrags-Übereinstimmung** — Der konfigurierte Code-Intelligence-Anbieter verifiziert, dass Backend-Implementierungen den Verträgen entsprechen, die von Frontend und Mobile konsumiert werden. Native Suche ist nur für Pfade außerhalb des Projekts oder für ignorierte Pfade vorgesehen.

2. **Typkonsistenz** — TypeScript-Typen, Python-Dataclasses oder Dart-Modelle, die domänenübergreifend geteilt werden, müssen konsistente Feldnamen und -typen verwenden.

3. **Authentifizierungsfluss** — Implementiert das Backend JWT-Auth, muss das Frontend Tokens korrekt in Headern senden, und die Mobile-App muss diese angemessen speichern und erneuern.

4. **Fehlerbehandlung** — Alle Konsumenten einer API müssen die dokumentierten Fehlerantworten behandeln. Gibt das Backend `{ "error": "unauthorized", "code": 401 }` zurück, müssen alle Clients dieses Format verarbeiten.

5. **Datenbank-Schema-Übereinstimmung** — Erstellt der Datenbank-Agent Migrationen, müssen die Backend-ORM-Modelle exakt zum Schema passen.

Das Alignment-Review des QA-Agenten (Schritt 6 in ultrawork, Schritt 6 in work) führt diese domänenübergreifende Validierung systematisch durch.

---

## Wann es fertig ist

Ein Multi-Agenten-Projekt ist abgeschlossen, wenn:

- Alle Agenten in allen Prioritätsstufen erfolgreich abgeschlossen haben.
- Verifikationsskripte für jeden Agenten bestehen (Exit-Code 0).
- QA-Review null CRITICAL- und null HIGH-Befunde meldet.
- Domänenübergreifende API-Vertrags-Übereinstimmung bestätigt ist.
- Build erfolgreich ist und alle Tests bestehen.
- Der Abschlussbericht im Memory geschrieben und dem Benutzer präsentiert wurde.
- Der Benutzer die abschließende Genehmigung erteilt hat (in `/work` und im SHIP_GATE von ultrawork).
