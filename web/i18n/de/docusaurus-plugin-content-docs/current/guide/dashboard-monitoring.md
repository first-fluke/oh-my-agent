---
title: "Anleitung: Dashboard-Überwachung"
sidebar_label: Dashboard-Überwachung
description: Überwachen Sie OMA-Sitzungen im Terminal oder über ein Loopback-Web-Dashboard, wählen Sie das Zustandsverzeichnis und beheben Sie typische Verbindungs- und Erkennungsprobleme.
---

# Anleitung: Dashboard-Überwachung

## Zwei Dashboard-Befehle

oh-my-agent bietet zwei Echtzeit-Dashboards zur Überwachung der Agentenaktivität während Multi-Agenten-Workflows.

| Befehl | Oberfläche | URL | Technologie |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/A (wird im Terminal gerendert) | chokidar-Dateiüberwachung, picocolors-Rendering |
| `oma dashboard web` | Browser | `http://127.0.0.1:9847` (Token wird beim Start ausgegeben) | HTTP-Server, WebSocket, chokidar-Dateiüberwachung |

Beide Dashboards überwachen standardmäßig `.agents/state/memories/`. Setzen Sie `MEMORIES_DIR`, wenn die Koordinationsdateien an einem anderen Ort liegen. Das Dashboard fällt nicht automatisch auf `.serena/memories/` zurück.

### Terminal-Dashboard

```bash
oma dashboard terminal
```

Rendert eine Rahmenzeichnungs-Oberfläche direkt im Terminal. Aktualisiert sich automatisch bei Änderungen an Memory-Dateien. Mit `Ctrl+C` beenden.

```
╔════════════════════════════════════════════════════════╗
║  OMA Memory Dashboard                                 ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**Statussymbole:**
- `●` (grün): läuft
- `✓` (cyan): abgeschlossen
- `✗` (rot): fehlgeschlagen
- `○` (gelb): blockiert
- `◌` (gedimmt): ausstehend

### Web-Dashboard

```bash
oma dashboard web
```

Startet einen nur an Loopback gebundenen Webserver auf Port 9847 (über `DASHBOARD_PORT` konfigurierbar). OMA gibt eine URL mit `127.0.0.1` aus. Öffnen Sie genau diese URL und bewahren Sie das Token auf. Die Seite verwendet das Token für `/api/state`, `/api/recap` und WebSocket-Updates. Anfragen ohne Token geben `401` zurück.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```

Das Web-Dashboard zeigt dieselben Informationen wie das Terminal-Dashboard, aber mit einer gestalteten Oberfläche im dunklen Theme mit:
- Verbindungsstatus-Badge (Verbunden / Getrennt / Verbindung mit automatischer Wiederherstellung)
- Sitzungs-ID und Statusleiste
- Agentenstatus-Tabelle mit animierten Statuspunkten
- Feed der neuesten Aktivitäten
- Automatisch aktualisierten Zeitstempeln

---

## Empfohlenes 3-Terminal-Layout

Für Multi-Agenten-Workflows wird folgendes Setup mit drei Terminal-Fenstern empfohlen:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard terminal              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent status session-20260324-143052 backend frontend   │
│   $ oma stats get                                                   │
│   $ oma verify agent backend -w ./api                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal 1** führt Ihre primäre Agentensitzung aus (Gemini CLI, Claude Code, Codex usw.), in der Sie mit Workflows wie `/orchestrate` oder `/work` interagieren.

**Terminal 2** führt das Dashboard zur passiven Überwachung aus. Es aktualisiert sich automatisch, ohne dass eine Interaktion erforderlich ist.

**Terminal 3** ist für Ad-hoc-Befehle: Agentenstatus prüfen, Verifikationen ausführen, Statistiken anzeigen oder Probleme debuggen.

---

## Datenquellen in .agents/state/memories/

Die Dashboards lesen aus dem `.agents/state/memories/`-Verzeichnis. Dieses Verzeichnis wird von Agenten und Workflows befüllt, die während der Ausführung Koordinationsdateien schreiben. Verwenden Sie `MEMORIES_DIR` für ein Projekt, dessen Zustand an einem anderen Ort gespeichert ist.

### Dateitypen und ihre Inhalte

| Dateimuster | Erstellt von | Inhalte |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Schritt 2 | Sitzungs-ID, Startzeit, Status (RUNNING/COMPLETED/FAILED), Workflow-Version |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Sitzungsmetadaten, Phasenfortschritt, Zusammenfassung der Benutzeranfrage |
| `task-board.md` | Orchestrierungs-Workflows | Markdown-Tabelle mit Agentenzuweisungen, Status und Aufgaben |
| `progress-{agent}.md` | Jeder gestartete Agent | Aktuelle Turn-Nummer, woran der Agent arbeitet, Zwischenergebnisse |
| `result-{agent}.md` | Jeder abgeschlossene Agent | Endstatus (COMPLETED/FAILED), geänderte Dateien, gefundene Probleme, Ergebnisse |
| `debug-{id}.md` | `/debug`-Workflow | Bug-Diagnose, Grundursache, angewendete Korrektur, Regressionstest-Speicherort |
| `experiment-ledger-{sessionId}.md` | Tatsächliche Experimente | Vergleichbare Belege für Baseline und Kandidat, erforderliche Prüfungen und Entscheidungen |
| `lessons-{sessionId}.md` | Wenn eine wiederverwendbare Ursache durch Belege gestützt ist | Sitzungsbezogene Erkenntnisse; keine durch einen Punktestand ausgelöste Erzeugung |

### Wie das Dashboard sie liest

Das Dashboard verwendet mehrere Strategien zur Informationsextraktion:

1. **Sitzungserkennung** — Sucht zuerst nach `orchestrator-session.md`, fällt dann auf die zuletzt modifizierte `session-*.md`-Datei zurück. Analysiert den Status aus Schlüsselwörtern: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.

2. **Task-Board-Analyse** — Liest `task-board.md` als Markdown-Tabelle. Extrahiert Agentenname, Status und Aufgabenbeschreibung aus den Spalten.

3. **Agentenerkennung** — Ohne Task Board werden Agenten durch Scannen aller `.md`-Dateien nach `**Agent**: {name}`-Mustern, `Agent: {name}`-Zeilen oder Dateinamen mit `_agent` oder `-agent` entdeckt.

4. **Turn-Zählung** — Für jeden entdeckten Agenten werden `progress-{agent}.md`-Dateien gelesen und die Turn-Nummer aus `turn: N`-Mustern extrahiert.

5. **Aktivitäts-Feed** — Listet die 5 zuletzt modifizierten `.md`-Dateien, extrahiert die letzte aussagekräftige Zeile (Überschriften, Statuszeilen, Aktionspunkte) als Aktivitätsnachricht. Das Web-Dashboard stellt außerdem die Recap-Ansicht unter `/recap` bereit.

---

## Was jedes Dashboard anzeigt

### Sitzungsstatus

Der obere Bereich zeigt:
- **Sitzungs-ID** — Extrahiert aus Sitzungsdateien (Format: `session-YYYYMMDD-HHMMSS`).
- **Status** — Farbcodiert: grün für LÄUFT, cyan für ABGESCHLOSSEN, rot für FEHLGESCHLAGEN, gelb für UNBEKANNT.

### Task-Board

Die Agententabelle zeigt jeden erkannten Agenten mit:
- **Agentenname** — Die Domänenkennung (backend, frontend, mobile, qa, debug, pm).
- **Status** — Aktueller Zustand mit visuellem Indikator (läuft/abgeschlossen/fehlgeschlagen/blockiert/ausstehend).
- **Turn** — Die aktuelle Turn-Nummer des Agenten (wie viele Iterationen er abgeschlossen hat). Aus Fortschrittsdateien extrahiert.
- **Aufgabe** — Kurze Beschreibung der aktuellen Arbeit des Agenten (bei Bedarf gekürzt).

### Agentenfortschritt

Der Fortschritt wird über `progress-{agent}.md`-Dateien verfolgt. Jede Datei wird vom Agenten während der Arbeit aktualisiert. Das Dashboard fragt diese Dateien ab nach:
- Turn-Nummer (wird mit dem Fortschritt des Agenten erhöht).
- Aktuelle Aktion (was der Agent gerade tut).
- Zwischenergebnisse (Teilabschlüsse).

### Ergebnisse

Bei Abschluss schreibt ein Agent `result-{agent}.md` mit:
- Endstatus (COMPLETED oder FAILED).
- Liste der geänderten Dateien.
- Aufgetretene Probleme.
- Erzeugte Ergebnisse.

Das Dashboard erkennt den Abschluss durch das Vorhandensein dieser Datei und aktualisiert den Status des Agenten entsprechend.

---

## Fehlerbehebungs-Handbuch

### Signal 1: Agent zeigt "läuft" aber kein Turn-Fortschritt

**Symptom:** Das Dashboard zeigt einen Agenten als laufend, aber die Turn-Nummer hat sich seit mehreren Minuten nicht geändert.

**Mögliche Ursachen:**
- Der Agent steckt bei einer langen Operation fest (großer Codebasis-Scan, langsamer API-Aufruf).
- Der Agent ist abgestürzt, aber die PID-Datei existiert noch.
- Der Agent wartet auf Benutzereingabe (sollte im Auto-Approve-Modus nicht vorkommen).

**Maßnahmen:**
1. Logdatei des Agenten prüfen: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Prüfen, ob der Prozess tatsächlich läuft: `oma agent status {session-id} {agent-id}`
3. Falls der Prozess nicht läuft, aber der Status "läuft" zeigt, ist der Agent abgestürzt. Mit Fehlerkontext erneut starten.

### Signal 2: Agent zeigt "abgestürzt"

**Symptom:** `oma agent status` gibt `crashed` für einen Agenten zurück.

**Mögliche Ursachen:**
- Der CLI-Vendor-Prozess wurde unerwartet beendet (Speichermangel, API-Kontingent überschritten, Netzwerk-Timeout).
- Das Workspace-Verzeichnis wurde gelöscht oder Berechtigungen geändert.
- Die Vendor-CLI ist nicht installiert oder nicht authentifiziert.

**Maßnahmen:**
1. Logdatei auf Fehlerdetails prüfen: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. CLI-Installation verifizieren: `oma doctor`
3. Authentifizierung prüfen: `oma auth status`
4. Agenten mit derselben Aufgabe erneut starten: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signal 3: Dashboard zeigt "Noch keine Agenten erkannt"

**Symptom:** Das Dashboard läuft, zeigt aber keine Agenten.

**Mögliche Ursachen:**
- Der Workflow hat den Agenten-Spawning-Schritt noch nicht erreicht.
- Das `.agents/state/memories/`-Verzeichnis ist leer.
- Das Dashboard überwacht das falsche Verzeichnis.

**Maßnahmen:**
1. Memories-Verzeichnis verifizieren: `ls -la .agents/state/memories/`
2. Prüfen, ob der Workflow noch in der Planungsphase ist (Agenten wurden noch nicht gestartet).
3. Sicherstellen, dass das Dashboard das richtige Projektverzeichnis überwacht: Das Dashboard löst den Memories-Pfad vom aktuellen Arbeitsverzeichnis auf.
4. Bei benutzerdefiniertem Pfad: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Signal 4: Web-Dashboard zeigt "Getrennt"

**Symptom:** Das Verbindungsbadge des Web-Dashboards zeigt "Disconnected" in Rot.

**Mögliche Ursachen:**
- Der `oma dashboard web`-Prozess wurde beendet.
- Der Browser verwendet eine veraltete URL oder das Start-Token fehlt.
- Der Port wird von einem anderen Prozess verwendet.

**Maßnahmen:**
1. Prüfen, ob der Dashboard-Prozess läuft: `ps aux | grep dashboard`
2. Genau die vom Prozess ausgegebene URL mit Token erneut öffnen; das Token nicht entfernen.
3. Einen anderen Port versuchen: `DASHBOARD_PORT=8080 oma dashboard web`
4. Port-Verfügbarkeit prüfen: `lsof -i :9847`
5. Das Web-Dashboard verbindet sich automatisch mit exponentiellem Backoff (Start bei 1 s, 1,5x-Multiplikator, max. 10 s). Einige Sekunden auf Wiederverbindung warten.

---

## Pre-Merge-Überwachungscheckliste

Bevor eine Multi-Agenten-Sitzung als abgeschlossen gilt, über das Dashboard verifizieren:

- [ ] **Alle Agenten zeigen "abgeschlossen"** — Keine Agenten im Zustand "läuft" oder "blockiert" hängengeblieben.
- [ ] **Keine Agenten zeigen "fehlgeschlagen"** — Falls welche fehlgeschlagen sind, Logs prüfen und erneut starten.
- [ ] **QA-Agent hat sein Review abgeschlossen** — Nach `result-qa-agent.md` oder `result-qa.md` suchen.
- [ ] **Null CRITICAL-/HIGH-Befunde** — QA-Ergebnisdatei auf Schweregrad-Zählungen prüfen.
- [ ] **Sitzungsstatus ist ABGESCHLOSSEN** — Die Sitzungsdatei sollte den Endstatus zeigen.
- [ ] **Aktivitäts-Feed zeigt Abschlussbericht** — Die letzte Aktivität sollte der Zusammenfassungsbericht sein.

---

## Abschlusskriterien

Die Dashboard-Überwachung ist abgeschlossen, wenn:
1. Alle gestarteten Agenten einen Endzustand erreicht haben (abgeschlossen oder fehlgeschlagen-und-behandelt).
2. Der QA-Review-Zyklus ohne blockierende Probleme abgeschlossen wurde.
3. Der Sitzungsstatus das Endergebnis widerspiegelt.
4. Ergebnisse im Memory für zukünftige Referenz aufgezeichnet sind.

---

## Technische Details

### Terminal-Dashboard (oma dashboard terminal)

- **Dateiüberwachung:** Verwendet [chokidar](https://github.com/paulmillr/chokidar) mit `awaitWriteFinish` (200 ms Stabilitätsschwelle, 50 ms Abfrageintervall), um das Rendern unvollständiger Dateischreibvorgänge zu vermeiden.
- **Rendering:** Löscht und zeichnet das gesamte Terminal bei jedem Dateiänderungsereignis neu. Verwendet `picocolors` für ANSI-Farbausgabe und Unicode-Rahmenzeichnungszeichen für den Rand.
- **Memory-Verzeichnis:** Aufgelöst aus `MEMORIES_DIR`, anschließend aus dem Dashboard-CLI-Argument, falls angegeben, und danach aus `{cwd}/.agents/state/memories`.
- **Sauberes Beenden:** Fängt `SIGINT` und `SIGTERM`, schließt den chokidar-Watcher und beendet sich ordnungsgemäß.

### Web-Dashboard (oma dashboard web)

- **HTTP-Server:** Node.js `createServer` liefert die HTML-Seite unter `/`, die Recap-Seite unter `/recap`, den JSON-Zustand unter `/api/state` und Recap-Daten unter `/api/recap`. Der Server bindet an `127.0.0.1`.
- **WebSocket:** Verwendet die `ws`-Bibliothek. Eine Loopback-Origin-Verbindung muss das Prozess-Token in ihrer Query-Zeichenfolge enthalten. Bei Verbindung erhält der Client sofort den vollständigen Zustand. Nachfolgende Updates werden als `{ type: "update", event, file, data }`-Nachrichten gepusht.
- **Dateiüberwachung:** Selbes chokidar-Setup wie das Terminal-Dashboard. Dateiänderungen lösen eine `broadcast()`-Funktion aus, die den aktuellen Zustand erstellt und an alle verbundenen WebSocket-Clients sendet.
- **Entprellung:** Updates werden mit 100 ms entprellt, um das Überschwemmen von Clients bei schnellen Dateischreibvorgängen zu vermeiden (z. B. wenn mehrere Agenten gleichzeitig Fortschritt schreiben).
- **Auto-Reconnect:** Der Browser-Client verbindet sich mit exponentiellem Backoff (1 s initial, 1,5x-Multiplikator, 10 s max) wieder, wenn die WebSocket-Verbindung abbricht.
- **Port:** Standard 9847, konfigurierbar über die Umgebungsvariable `DASHBOARD_PORT`. API-Anfragen akzeptieren `X-OMA-Dashboard-Token` oder `?token=...`; fehlende oder ungültige Tokens geben `401` zurück.
- **Zustandsaufbau:** Die `buildFullState()`-Funktion aggregiert Sitzungsinformationen, Task-Board, Agentenstatus, Turn-Zähler und Aktivitäts-Feed bei jedem Update in ein einzelnes JSON-Objekt.
