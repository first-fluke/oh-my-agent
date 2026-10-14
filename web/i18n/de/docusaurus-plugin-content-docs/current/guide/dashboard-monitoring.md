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
| `oma dashboard web` | Browser | `http://127.0.0.1:9847/` (wird beim Start ausgegeben) | HTTP-Server, WebSocket, chokidar-Dateiüberwachung |

Beide Dashboards überwachen standardmäßig `.agents/state/memories/` im aktuellen Verzeichnis. Übergeben Sie `--project-root <path>`, um ein anderes Projekt zu überwachen, oder setzen Sie `MEMORIES_DIR`, wenn die Koordinationsdateien an einem anderen Ort liegen. Das Dashboard fällt nicht automatisch auf `.serena/memories/` zurück.

### Terminal-Dashboard

```bash
oma dashboard terminal
```

Rendert eine Rahmenzeichnungs-Oberfläche direkt im Terminal. Aktualisiert sich automatisch bei Änderungen an Memory-Dateien. Mit `Ctrl+C` beenden. Der Bildschirm hat von oben nach unten vier Bereiche:

| Bereich | Zeigt | Quelle |
|:-------|:------|:-------|
| Kopfzeile | `OMA Memory Dashboard` und `Session: <id> [<status>]` | `orchestrator-session.md`, sonst die neueste `session-*.md`; `N/A [UNKNOWN]`, wenn keine von beiden existiert |
| Agententabelle | Agent, Status, Turn und Task (erste 20 Zeichen); `No agents detected yet`, wenn leer | `task-board.md`, sonst in Memory-Dateien gefundene Agenten |
| Latest Activity | Bis zu fünf Zeilen `[<name>] <message>`; `No activity yet`, wenn leer | Letzte aussagekräftige Zeile der fünf zuletzt geänderten `.md`-Dateien |
| Fußzeile | `Updated: <time>  \|  Ctrl+C to exit` | Zeitpunkt des letzten Neuzeichnens |

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

Startet einen nur an Loopback gebundenen Webserver auf Port 9847 (über `DASHBOARD_PORT` konfigurierbar). Der Befehl gibt `http://127.0.0.1:9847/` und `Watching: <memories dir>` aus. Jeder Start erzeugt ein neues Zugriffstoken und bettet es in die ausgelieferte Seite ein; öffnen Sie also die ausgegebene URL, es muss nichts kopiert werden. Die Seite sendet das Token mit Anfragen an `/api/state`, `/api/recap` und den WebSocket; Anfragen ohne Token geben `401` zurück.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# Recap view from the same process: http://127.0.0.1:9847/recap
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

| Fenster | Ausführen | Zweck |
|:-----|:----|:--------|
| 1. Hauptagent | Ihre Host-CLI (`claude`, `codex`, `agy`, `qwen` usw.), dann `/orchestrate` oder `/work` | Den Workflow steuern |
| 2. Dashboard | `oma dashboard terminal` (oder `oma dashboard web`) | Fortschritt passiv beobachten; aktualisiert sich ohne Interaktion |
| 3. Ad-hoc-Befehle | `oma agent status session-20260324-143052 backend frontend`, `oma stats get`, `oma verify agent backend -w ./api` | Agentenstatus prüfen, Verifikationen ausführen, Statistiken anzeigen oder Probleme debuggen |

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

1. **Sitzungserkennung:** Sucht zuerst nach `orchestrator-session.md`, fällt dann auf die zuletzt modifizierte `session-*.md`-Datei zurück. Analysiert den Status aus Schlüsselwörtern: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.

2. **Task-Board-Analyse:** Liest `task-board.md` als Markdown-Tabelle. Extrahiert Agentenname, Status und Aufgabenbeschreibung aus den Spalten.

3. **Agentenerkennung:** Ohne Task Board werden Agenten durch Scannen aller `.md`-Dateien nach `**Agent**: {name}`-Mustern, `Agent: {name}`-Zeilen oder Dateinamen mit `_agent` oder `-agent` entdeckt.

4. **Turn-Zählung:** Für jeden entdeckten Agenten werden `progress-{agent}.md`-Dateien gelesen und die Turn-Nummer aus `turn: N`-Mustern extrahiert.

5. **Aktivitäts-Feed:** Listet die 5 zuletzt modifizierten `.md`-Dateien, extrahiert die letzte aussagekräftige Zeile (Überschriften, Statuszeilen, Aktionspunkte) als Aktivitätsnachricht. Das Web-Dashboard stellt außerdem die Recap-Ansicht unter `/recap` bereit.

---

## Was jedes Dashboard anzeigt

### Sitzungsstatus

Der obere Bereich zeigt:
- **Sitzungs-ID:** Extrahiert aus Sitzungsdateien (Format: `session-YYYYMMDD-HHMMSS`).
- **Status:** Farbcodiert: grün für RUNNING, cyan für COMPLETED, rot für FAILED, gelb für UNKNOWN.

### Task-Board

Die Agententabelle zeigt jeden erkannten Agenten mit:
- **Agentenname:** Die Domänenkennung (backend, frontend, mobile, qa, debug, pm).
- **Status:** Aktueller Zustand mit visuellem Indikator (läuft/abgeschlossen/fehlgeschlagen/blockiert/ausstehend).
- **Turn:** Die aktuelle Turn-Nummer des Agenten (wie viele Iterationen er abgeschlossen hat). Aus Fortschrittsdateien extrahiert.
- **Aufgabe:** Kurze Beschreibung der aktuellen Arbeit des Agenten (bei Bedarf gekürzt).

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

## Fehlerbehebungs-Handbuch {#troubleshooting-runbook}

### Signal 1: Agent zeigt „running“, aber kein Turn-Fortschritt

**Symptom:** Das Dashboard zeigt einen Agenten als laufend, aber die Turn-Nummer hat sich seit mehreren Minuten nicht geändert.

**Mögliche Ursachen:**
- Der Agent steckt bei einer langen Operation fest (großer Codebasis-Scan, langsamer API-Aufruf).
- Der Agent ist abgestürzt, aber die PID-Datei existiert noch.
- Der Agent wartet auf Benutzereingabe (sollte im Auto-Approve-Modus nicht vorkommen).

**Maßnahmen:**
1. Logdatei des Agenten prüfen. `oma agent spawn` gibt ihren Pfad als `Log: ...` aus; sie liegt im temporären Verzeichnis des Betriebssystems: `cat "${TMPDIR:-/tmp}/subagent-{session-id}-{agent-id}.log"`
2. Prüfen, ob der Prozess tatsächlich läuft: `oma agent status {session-id} {agent-id}`
3. Falls der Prozess nicht läuft, aber der Status „running“ zeigt, ist der Agent abgestürzt. Mit Fehlerkontext erneut starten.

### Signal 2: Agent zeigt „crashed“

**Symptom:** `oma agent status` gibt `crashed` für einen Agenten zurück.

**Mögliche Ursachen:**
- Der CLI-Vendor-Prozess wurde unerwartet beendet (Speichermangel, API-Kontingent überschritten, Netzwerk-Timeout).
- Das Workspace-Verzeichnis wurde gelöscht oder Berechtigungen geändert.
- Die Vendor-CLI ist nicht installiert oder nicht authentifiziert.

**Maßnahmen:**
1. Logdatei auf Fehlerdetails prüfen: `cat "${TMPDIR:-/tmp}/subagent-{session-id}-{agent-id}.log"` (der von `oma agent spawn` ausgegebene `Log:`-Pfad)
2. CLI-Installation verifizieren: `oma doctor`
3. Authentifizierung prüfen: `oma auth status`
4. Agenten mit derselben Aufgabe erneut starten: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signal 3: Dashboard zeigt „No agents detected yet“

**Symptom:** Das Dashboard läuft, zeigt aber keine Agenten.

**Mögliche Ursachen:**
- Der Workflow hat den Agenten-Spawning-Schritt noch nicht erreicht.
- Das `.agents/state/memories/`-Verzeichnis ist leer.
- Das Dashboard überwacht das falsche Verzeichnis.

**Maßnahmen:**
1. Memories-Verzeichnis verifizieren: `ls -la .agents/state/memories/`
2. Prüfen, ob der Workflow noch in der Planungsphase ist (Agenten wurden noch nicht gestartet).
3. Sicherstellen, dass das Dashboard das richtige Projektverzeichnis überwacht: Das Dashboard löst den Memories-Pfad vom aktuellen Arbeitsverzeichnis auf. Aus dem Projektstamm ausführen oder `--project-root /path/to/project` übergeben. `oma dashboard web` gibt den überwachten Pfad als `Watching: <path>` aus.
4. Bei benutzerdefiniertem Pfad: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Signal 4: Web-Dashboard zeigt „Disconnected“

**Symptom:** Das Verbindungsbadge des Web-Dashboards zeigt "Disconnected" in Rot.

**Mögliche Ursachen:**
- Der `oma dashboard web`-Prozess wurde beendet.
- Der `oma dashboard web`-Prozess wurde neu gestartet, und der geöffnete Tab hält noch das Token des vorherigen Prozesses.

**Maßnahmen:**
1. Prüfen, ob der Dashboard-Prozess läuft: `ps aux | grep dashboard`
2. Wenn Sie das Dashboard neu gestartet haben, die Seite neu laden, damit sie das neue Token übernimmt.
3. Wenn der Prozess beendet wurde, `oma dashboard web` erneut starten und anschließend die Seite neu laden.
4. Schlägt der Start mit `Dashboard failed: port 9847 is already in use` fehl, den Port prüfen (`lsof -i :9847`) und einen anderen versuchen: `DASHBOARD_PORT=8080 oma dashboard web`
5. Das Web-Dashboard verbindet sich automatisch mit exponentiellem Backoff neu (Start bei 1 s, max. 10 s). Einige Sekunden auf die Wiederverbindung warten.

---

## Pre-Merge-Überwachungscheckliste

Bevor eine Multi-Agenten-Sitzung als abgeschlossen gilt, über das Dashboard verifizieren:

- [ ] **Alle Agenten zeigen „completed“:** Keine Agenten im Zustand „running“ oder „blocked“ hängengeblieben.
- [ ] **Keine Agenten zeigen „failed“:** Falls welche fehlgeschlagen sind, Logs prüfen und erneut starten.
- [ ] **QA-Agent hat sein Review abgeschlossen:** Nach `result-qa-agent.md` oder `result-qa.md` suchen.
- [ ] **Null CRITICAL-/HIGH-Befunde:** QA-Ergebnisdatei auf Schweregrad-Zählungen prüfen.
- [ ] **Sitzungsstatus ist COMPLETED:** Die Sitzungsdatei sollte den Endstatus zeigen.
- [ ] **Aktivitäts-Feed zeigt Abschlussbericht:** Die letzte Aktivität sollte der Zusammenfassungsbericht sein.

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
- **Memory-Verzeichnis:** `MEMORIES_DIR`, wenn gesetzt; sonst `<project>/.agents/state/memories`, wobei `<project>` `--project-root <path>` oder das aktuelle Verzeichnis ist. Ein fehlendes Verzeichnis wird leer angelegt.
- **Sauberes Beenden:** Fängt `SIGINT` und `SIGTERM`, schließt den chokidar-Watcher und beendet sich ordnungsgemäß.

### Web-Dashboard (oma dashboard web)

- **HTTP-Server:** Node.js `createServer` liefert die HTML-Seite unter `/`, die Recap-Seite unter `/recap`, den JSON-Zustand unter `/api/state` und Recap-Daten unter `/api/recap`. Der Server bindet an `127.0.0.1`.
- **WebSocket:** Verwendet die `ws`-Bibliothek. Eine Loopback-Origin-Verbindung muss das Prozess-Token in ihrer Query-Zeichenfolge enthalten. Bei Verbindung erhält der Client sofort den vollständigen Zustand. Nachfolgende Updates werden als `{ type: "update", event, file, data }`-Nachrichten gepusht.
- **Dateiüberwachung:** Selbes chokidar-Setup wie das Terminal-Dashboard. Dateiänderungen lösen eine `broadcast()`-Funktion aus, die den aktuellen Zustand erstellt und an alle verbundenen WebSocket-Clients sendet.
- **Entprellung:** Updates werden mit 100 ms entprellt, um das Überschwemmen von Clients bei schnellen Dateischreibvorgängen zu vermeiden (z. B. wenn mehrere Agenten gleichzeitig Fortschritt schreiben).
- **Auto-Reconnect:** Der Browser-Client verbindet sich mit exponentiellem Backoff (1 s initial, 1,5x-Multiplikator, 10 s max) wieder, wenn die WebSocket-Verbindung abbricht.
- **Port:** Standard 9847, konfigurierbar über die Umgebungsvariable `DASHBOARD_PORT`. API-Anfragen akzeptieren `X-OMA-Dashboard-Token` oder `?token=...`; fehlende oder ungültige Tokens geben `401` zurück.
- **Zustandsaufbau:** Die `buildFullState()`-Funktion aggregiert Sitzungsinformationen, Task-Board, Agentenstatus, Turn-Zähler und Aktivitäts-Feed bei jedem Update in ein einzelnes JSON-Objekt.

---

## Nächste Schritte

- Ergebnisse nach einem Lauf prüfen oder fortsetzen: [Ergebnisse und Fortsetzen](./agent-results-and-resume.md)
- Dashboard- und Lauffehler nach Symptom: [Fehlerbehebung](./troubleshooting.md)
- Multi-Agenten-Arbeit planen und ausführen: [Multi-Agenten-Projekte](./multi-agent-project.md)
