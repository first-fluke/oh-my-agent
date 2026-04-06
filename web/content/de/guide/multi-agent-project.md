---
title: "Anleitung: Multi-Agenten-Projekte"
description: Vollständige Anleitung zur Koordination mehrerer Domain-Agenten über Frontend, Backend, Datenbank, Mobile und QA — von der Planung bis zum Merge.
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
2. **Technische Machbarkeit analysieren** — Verwendet MCP-Code-Analyse-Tools (`get_symbols_overview`, `find_symbol`, `search_for_pattern`), um die vorhandene Codebasis nach wiederverwendbarem Code und Architekturmustern zu scannen.
3. **API-Verträge definieren** — Entwirft Endpunkt-Verträge (Methode, Pfad, Anfrage-/Antwort-Schemata, Auth, Fehlerantworten) und speichert sie in `.agents/skills/_shared/core/api-contracts/`.
4. **In Aufgaben zerlegen** — Zerlegt das Projekt in umsetzbare Aufgaben, jeweils mit: zugewiesenem Agenten, Titel, Akzeptanzkriterien, Priorität (P0-P3) und Abhängigkeiten.
5. **Plan mit Benutzer prüfen** — Präsentiert den vollständigen Plan zur Bestätigung. Der Workflow fährt ohne explizite Benutzergenehmigung nicht fort.
6. **Plan speichern** — Schreibt den genehmigten Plan nach `.agents/plan.json` und zeichnet eine Zusammenfassung im Memory auf.

Die Ausgabe `.agents/plan.json` ist die Eingabe für sowohl `/work` als auch `/orchestrate`.

### Schritt 2: /work oder /orchestrate — Ausführung

Es gibt zwei Ausführungspfade:

| Aspekt | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interaktion** | Interaktiv — Benutzer bestätigt bei jeder Stufe | Automatisiert — läuft bis zum Abschluss |
| **PM-Planung** | Eingebaut (Schritt 2 führt PM-Agent aus) | Benötigt plan.json von /plan |
| **Benutzer-Checkpoint** | Nach Plan-Review (Schritt 3) | Vor dem Start (Plan muss existieren) |
| **Persistenter Modus** | Ja — kann bis zum Abschluss nicht beendet werden | Ja — kann bis zum Abschluss nicht beendet werden |
| **Am besten für** | Erstmalige Nutzung, komplexe Projekte mit Aufsichtsbedarf | Wiederholte Läufe, klar definierte Aufgaben |

#### /work — Interaktive Multi-Agenten-Pipeline

```
/work
```

1. Analysiert die Benutzeranfrage und identifiziert beteiligte Domänen.
2. Führt den PM-Agenten zur Aufgabenzerlegung aus (erstellt plan.json).
3. Präsentiert den Plan zur Benutzerbestätigung — **blockiert bis zur Bestätigung**.
4. Startet Agenten nach Prioritätsstufe (P0 zuerst, dann P1 usw.), wobei Aufgaben gleicher Priorität parallel laufen.
5. Überwacht den Agentenfortschritt über Memory-Dateien.
6. Führt QA-Agent-Review aller Ergebnisse durch (OWASP Top 10, Performance, Barrierefreiheit, Code-Qualität).
7. Bei CRITICAL- oder HIGH-Problemen wird der zuständige Agent mit QA-Befunden erneut gestartet. Bis zu 2 Wiederholungen pro Problem. Besteht dasselbe Problem weiter, wird die **Explorationsschleife** aktiviert — 2-3 alternative Ansätze werden generiert, derselbe Agententyp wird mit verschiedenen Hypothesen-Prompts in separaten Workspaces gestartet, QA bewertet jeden, und das beste Ergebnis wird übernommen.

#### /orchestrate — Automatisierte parallele Ausführung

```
/orchestrate
```

1. Lädt `.agents/plan.json` (fährt ohne diesen nicht fort).
2. Initialisiert eine Sitzung mit ID-Format `session-YYYYMMDD-HHMMSS`.
3. Erstellt `orchestrator-session.md` und `task-board.md` im Memory-Verzeichnis.
4. Startet Agenten pro Prioritätsstufe, jeweils mit: Aufgabenbeschreibung, API-Verträgen und Kontext.
5. Überwacht den Fortschritt durch Abfrage der `progress-{agent}.md`-Dateien.
6. Verifiziert jeden abgeschlossenen Agenten über `verify.sh` — PASS (Exit-Code 0) akzeptiert, FAIL (Exit-Code 1) startet mit Fehlerkontext erneut (max. 2 Wiederholungen), dauerhaftes Scheitern löst die Explorationsschleife aus.
7. Sammelt alle `result-{agent}.md`-Dateien und erstellt einen Abschlussbericht.

### Schritt 3: agent:spawn — CLI-Agenten-Verwaltung

Der `agent:spawn`-Befehl ist der Low-Level-Mechanismus, den Workflows intern aufrufen. Sie können ihn auch direkt verwenden:

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Alle Flags:**

| Flag | Beschreibung |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI-Vendor-Überschreibung (gemini/claude/codex/qwen). Überschreibt alle Konfiguration. |
| `-w, --workspace <path>` | Arbeitsverzeichnis für den Agenten. Automatisch aus Monorepo-Konfiguration erkannt, wenn nicht angegeben. |

**Vendor-Auflösungsreihenfolge** (erster Treffer gewinnt):

1. `--model`-Flag auf der Kommandozeile
2. `agent_cli_mapping` in `oma-config.yaml` für diesen spezifischen Agententyp
3. `default_cli` in `oma-config.yaml`
4. `active_vendor` in `cli-config.yaml`
5. `gemini` (fest codierter Standard)

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
7. **Bericht** — Befunde kategorisiert als CRITICAL / HIGH / MEDIUM / LOW mit `Datei:Zeile`, Beschreibung und Behebungscode.

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
oma agent:spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Contract-First-Regel

API-Verträge sind der Synchronisierungsmechanismus zwischen Agenten. Die Contract-First-Regel bedeutet:

1. **Verträge werden definiert, bevor die Implementierung beginnt.** Schritt 3 des `/plan`-Workflows erzeugt API-Verträge, die in `.agents/skills/_shared/core/api-contracts/` gespeichert werden.

2. **Jeder Agent erhält seine relevanten Verträge als Kontext.** Wenn `/orchestrate` Agenten in Schritt 3 startet, erhält jeder Agent "Aufgabenbeschreibung, API-Verträge, relevanter Kontext."

3. **Verträge definieren die Schnittstellengrenze.** Ein Vertrag spezifiziert:
   - HTTP-Methode und Pfad
   - Request-Body-Schema (mit Typen)
   - Response-Body-Schema (mit Typen)
   - Authentifizierungsanforderungen
   - Fehlerantwortformate

4. **Vertragsverletzungen werden während der Überwachung erkannt.** Schritt 5 von `/work` verwendet MCP-Code-Analyse-Tools (`find_symbol`, `search_for_pattern`), um die API-Vertrags-Übereinstimmung zwischen Agenten zu verifizieren.

5. **QA-Review prüft die Vertragseinhaltung.** Das Alignment-Review des QA-Agenten (Schritt 6 in ultrawork) vergleicht explizit die Implementierung mit dem Plan, einschließlich der API-Verträge.

**Warum das wichtig ist:** Ohne Verträge könnte ein Backend-Agent `{ "user_id": 1 }` zurückgeben, während der Frontend-Agent `{ "userId": 1 }` erwartet. Die Contract-First-Regel eliminiert diese Klasse von Integrationsfehlern vollständig.

---

## Merge-Gates: 4 Bedingungen

Bevor eine Multi-Agenten-Arbeit als abgeschlossen gilt, müssen vier Bedingungen erfüllt sein:

### 1. Build erfolgreich

Aller Code kompiliert und baut fehlerfrei. Dies wird durch das Verifikationsskript (`verify.sh`) geprüft, das zum Agententyp passende Build-Befehle ausführt.

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
# Backend-Agent mit Gemini (Standard) starten
oma agent:spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Frontend-Agent mit Claude, expliziter Workspace
oma agent:spawn frontend "Build user dashboard with React" session-20260324-143000 -m claude -w ./apps/web

# Aus einer Prompt-Datei starten
oma agent:spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Parallele Ausführung über agent:parallel

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
oma agent:parallel tasks.yaml
```

Im Inline-Modus:

```bash
oma agent:parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Hintergrundmodus (kein Warten):

```bash
oma agent:parallel tasks.yaml --no-wait
# Kehrt sofort zurück, Ergebnisse werden nach .agents/results/parallel-{timestamp}/ geschrieben
```

Mit Vendor-Überschreibung:

```bash
oma agent:parallel tasks.yaml -m claude
```

---

## Zu vermeidende Anti-Patterns

### 1. Plan überspringen

`/orchestrate` ohne plan.json starten. Der Workflow wird die Ausführung verweigern. Immer zuerst `/plan` ausführen oder `/work` verwenden, das eingebaute Planung hat.

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

`agent:spawn` direkt verwenden, ohne danach das Verifikationsskript auszuführen. Der Verifikationsschritt erkennt Build-Fehler, Test-Regressionen und Scope-Verletzungen, die sich sonst ausbreiten würden.

---

## Domänenübergreifende Integrationsvalidierung

Nachdem alle Agenten ihre individuellen Aufgaben abgeschlossen haben, muss die domänenübergreifende Integration validiert werden:

1. **API-Vertrags-Übereinstimmung** — MCP-Tools (`find_symbol`, `search_for_pattern`) verifizieren, dass Backend-Implementierungen den Verträgen entsprechen, die von Frontend und Mobile konsumiert werden.

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
