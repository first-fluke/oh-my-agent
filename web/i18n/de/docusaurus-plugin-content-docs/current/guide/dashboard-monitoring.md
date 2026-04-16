---
title: "Anleitung: Dashboard-Überwachung"
description: Umfassende Dashboard-Anleitung zu Terminal- und Web-Dashboards, Datenquellen, 3-Terminal-Layout, Fehlerbehebung und technischen Implementierungsdetails.
---

# Anleitung: Dashboard-Überwachung

## Zwei Dashboard-Befehle

oh-my-agent bietet zwei Echtzeit-Dashboards zur Überwachung der Agentenaktivität während Multi-Agenten-Workflows.

| Befehl | Oberfläche | URL | Technologie |
|:--------|:---------|:----|:-----------|
| `oma dashboard` | Terminal (TUI) | N/A — rendert in Ihrem Terminal | chokidar Dateiüberwachung, picocolors Rendering |
| `oma dashboard:web` | Browser | `http://localhost:9847` | HTTP-Server, WebSocket, chokidar Dateiüberwachung |

Beide Dashboards überwachen dieselbe Datenquelle: das `.serena/memories/`-Verzeichnis.

### Terminal-Dashboard

```bash
oma dashboard
```

Rendert eine Rahmenzeichnungs-Oberfläche direkt im Terminal. Aktualisiert sich automatisch bei Änderungen an Memory-Dateien. Mit `Strg+C` beenden.

```
╔════════════════════════════════════════════════════════╗
║  Serena Memory Dashboard                              ║
║  Sitzung: session-20260324-143052  [LÄUFT]            ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Zug    Aufgabe             ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● läuft      3      User-API impl.     ║
║  frontend     ● läuft      2      Login-Seite bauen  ║
║  mobile       ✓ fertig     5      Auth-Screens fertig║
║  qa           ○ blockiert  -                          ║
╠════════════════════════════════════════════════════════╣
║  Letzte Aktivität:                                    ║
║  [backend] JWT-Token-Validierung implementieren       ║
║  [frontend] Login-Formular-Komponenten erstellen      ║
║  [mobile] Biometrische Auth-Integration abgeschlossen ║
╠════════════════════════════════════════════════════════╣
║  Aktualisiert: 24.03.2026, 14:31:15 | Strg+C zum     ║
║  Beenden                                              ║
╚════════════════════════════════════════════════════════╝
```

**Statussymbole:**
- `●` (grün) — läuft
- `✓` (cyan) — abgeschlossen
- `✗` (rot) — fehlgeschlagen
- `○` (gelb) — blockiert
- `◌` (gedimmt) — ausstehend

### Web-Dashboard

```bash
oma dashboard:web
```

Öffnet einen Webserver auf Port 9847 (konfigurierbar über die Umgebungsvariable `DASHBOARD_PORT`). Die Browser-Oberfläche verbindet sich über WebSocket und empfängt Live-Updates.

```bash
# Benutzerdefinierter Port
DASHBOARD_PORT=8080 oma dashboard:web

# Benutzerdefiniertes Memories-Verzeichnis
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

Das Web-Dashboard zeigt dieselben Informationen wie das Terminal-Dashboard, aber mit einer gestylten Dark-Theme-Oberfläche mit:
- Verbindungsstatus-Badge (Verbunden / Getrennt / Verbinde mit Auto-Reconnect)
- Sitzungs-ID und Statusleiste
- Agentenstatus-Tabelle mit animierten Statuspunkten
- Neueste-Aktivität-Feed
- Automatisch aktualisierende Zeitstempel

---

## Empfohlenes 3-Terminal-Layout

Für Multi-Agenten-Workflows wird folgendes Setup mit drei Terminal-Fenstern empfohlen:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Haupt-Agent      │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Sitzung: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc-Befehle                                    │
│                                                                 │
│   $ oma agent:status session-20260324-143052 backend frontend   │
│   $ oma stats                                                   │
│   $ oma verify backend -w ./api                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal 1** führt Ihre primäre Agentensitzung aus (Gemini CLI, Claude Code, Codex usw.), in der Sie mit Workflows wie `/orchestrate` oder `/work` interagieren.

**Terminal 2** führt das Dashboard zur passiven Überwachung aus. Es aktualisiert sich automatisch — keine Interaktion nötig.

**Terminal 3** ist für Ad-hoc-Befehle: Agentenstatus prüfen, Verifikationen ausführen, Statistiken anzeigen oder Probleme debuggen.

---

## Datenquellen in .serena/memories/

Die Dashboards lesen aus dem `.serena/memories/`-Verzeichnis. Dieses Verzeichnis wird von Agenten und Workflows über MCP-Memory-Tools während der Ausführung befüllt.

### Dateitypen und ihre Inhalte

| Dateimuster | Erstellt von | Inhalte |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Schritt 2 | Sitzungs-ID, Startzeit, Status (RUNNING/COMPLETED/FAILED), Workflow-Version |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Sitzungsmetadaten, Phasenfortschritt, Zusammenfassung der Benutzeranfrage |
| `task-board.md` | Orchestrierungs-Workflows | Markdown-Tabelle mit Agentenzuweisungen, Status und Aufgaben |
| `progress-{agent}.md` | Jeder gestartete Agent | Aktuelle Zugnummer, woran der Agent arbeitet, Zwischenergebnisse |
| `result-{agent}.md` | Jeder abgeschlossene Agent | Endstatus (COMPLETED/FAILED), geänderte Dateien, gefundene Probleme, Ergebnisse |
| `debug-{id}.md` | `/debug`-Workflow | Bug-Diagnose, Grundursache, angewendete Korrektur, Regressionstest-Speicherort |
| `experiment-ledger.md` | Qualitätsbewertungssystem | Experimentverfolgung: Baseline-Bewertungen, Deltas, Behalten-/Verwerfen-Entscheidungen |
| `lessons-learned.md` | Automatisch am Sitzungsende generiert | Erkenntnisse aus verworfenen Experimenten (Delta <= -5) |

### Wie das Dashboard sie liest

Das Dashboard verwendet mehrere Strategien zur Informationsextraktion:

1. **Sitzungserkennung** — Sucht zuerst nach `orchestrator-session.md`, fällt dann auf die zuletzt modifizierte `session-*.md`-Datei zurück. Analysiert den Status aus Schlüsselwörtern: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.

2. **Task-Board-Analyse** — Liest `task-board.md` als Markdown-Tabelle. Extrahiert Agentenname, Status und Aufgabenbeschreibung aus den Spalten.

3. **Agentenerkennung** — Ohne Task Board werden Agenten durch Scannen aller `.md`-Dateien nach `**Agent**: {name}`-Mustern, `Agent: {name}`-Zeilen oder Dateinamen mit `_agent` oder `-agent` entdeckt.

4. **Zugzählung** — Für jeden entdeckten Agenten werden `progress-{agent}.md`-Dateien gelesen und die Zugnummer aus `turn: N`-Mustern extrahiert.

5. **Aktivitäts-Feed** — Listet die 5 zuletzt modifizierten `.md`-Dateien, extrahiert die letzte aussagekräftige Zeile (Überschriften, Statuszeilen, Aktionspunkte) als Aktivitätsnachricht.

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
- **Zug** — Die aktuelle Zugnummer des Agenten (wie viele Iterationen er abgeschlossen hat). Aus Fortschrittsdateien extrahiert.
- **Aufgabe** — Kurze Beschreibung der aktuellen Arbeit des Agenten (bei Bedarf gekürzt).

### Agentenfortschritt

Der Fortschritt wird über `progress-{agent}.md`-Dateien verfolgt. Jede Datei wird vom Agenten während der Arbeit aktualisiert. Das Dashboard fragt diese Dateien ab nach:
- Zugnummer (inkrementiert mit dem Fortschritt des Agenten).
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

### Signal 1: Agent zeigt "läuft" aber kein Zugfortschritt

**Symptom:** Das Dashboard zeigt einen Agenten als laufend, aber die Zugnummer hat sich seit mehreren Minuten nicht geändert.

**Mögliche Ursachen:**
- Der Agent steckt bei einer langen Operation fest (großer Codebasis-Scan, langsamer API-Aufruf).
- Der Agent ist abgestürzt, aber die PID-Datei existiert noch.
- Der Agent wartet auf Benutzereingabe (sollte im Auto-Approve-Modus nicht vorkommen).

**Maßnahmen:**
1. Logdatei des Agenten prüfen: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Prüfen, ob der Prozess tatsächlich läuft: `oma agent:status {session-id} {agent-id}`
3. Falls der Prozess nicht läuft, aber der Status "läuft" zeigt, ist der Agent abgestürzt. Mit Fehlerkontext erneut starten.

### Signal 2: Agent zeigt "abgestürzt"

**Symptom:** `oma agent:status` gibt `crashed` für einen Agenten zurück.

**Mögliche Ursachen:**
- Der CLI-Vendor-Prozess wurde unerwartet beendet (Speichermangel, API-Kontingent überschritten, Netzwerk-Timeout).
- Das Workspace-Verzeichnis wurde gelöscht oder Berechtigungen geändert.
- Die Vendor-CLI ist nicht installiert oder nicht authentifiziert.

**Maßnahmen:**
1. Logdatei auf Fehlerdetails prüfen: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. CLI-Installation verifizieren: `oma doctor`
3. Authentifizierung prüfen: `oma auth:status`
4. Agenten mit derselben Aufgabe erneut starten: `oma agent:spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signal 3: Dashboard zeigt "Noch keine Agenten erkannt"

**Symptom:** Das Dashboard läuft, zeigt aber keine Agenten.

**Mögliche Ursachen:**
- Der Workflow hat den Agenten-Spawning-Schritt noch nicht erreicht.
- Das `.serena/memories/`-Verzeichnis ist leer.
- Das Dashboard überwacht das falsche Verzeichnis.

**Maßnahmen:**
1. Memories-Verzeichnis verifizieren: `ls -la .serena/memories/`
2. Prüfen, ob der Workflow noch in der Planungsphase ist (Agenten wurden noch nicht gestartet).
3. Sicherstellen, dass das Dashboard das richtige Projektverzeichnis überwacht: Das Dashboard löst den Memories-Pfad vom aktuellen Arbeitsverzeichnis auf.
4. Bei benutzerdefiniertem Pfad: `MEMORIES_DIR=/path/to/.serena/memories oma dashboard`

### Signal 4: Web-Dashboard zeigt "Getrennt"

**Symptom:** Das Verbindungsbadge des Web-Dashboards zeigt "Disconnected" in Rot.

**Mögliche Ursachen:**
- Der `oma dashboard:web`-Prozess wurde beendet.
- Ein Netzwerkproblem zwischen Browser und localhost.
- Der Port wird von einem anderen Prozess verwendet.

**Maßnahmen:**
1. Prüfen, ob der Dashboard-Prozess läuft: `ps aux | grep dashboard`
2. Einen anderen Port versuchen: `DASHBOARD_PORT=8080 oma dashboard:web`
3. Port-Verfügbarkeit prüfen: `lsof -i :9847`
4. Das Web-Dashboard verbindet sich automatisch mit exponentiellem Backoff (Start bei 1 s, 1,5x-Multiplikator, max. 10 s). Einige Sekunden auf Wiederverbindung warten.

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

### Terminal-Dashboard (oma dashboard)

- **Dateiüberwachung:** Verwendet [chokidar](https://github.com/paulmillr/chokidar) mit `awaitWriteFinish` (200 ms Stabilitätsschwelle, 50 ms Abfrageintervall), um das Rendern unvollständiger Dateischreibvorgänge zu vermeiden.
- **Rendering:** Löscht und zeichnet das gesamte Terminal bei jedem Dateiänderungsereignis neu. Verwendet `picocolors` für ANSI-Farbausgabe und Unicode-Rahmenzeichnungszeichen für den Rand.
- **Memory-Verzeichnis:** Aufgelöst aus der Umgebungsvariable `MEMORIES_DIR`, einem CLI-Argument oder `{cwd}/.serena/memories`.
- **Sauberes Beenden:** Fängt `SIGINT` und `SIGTERM`, schließt den chokidar-Watcher und beendet sich ordnungsgemäß.

### Web-Dashboard (oma dashboard:web)

- **HTTP-Server:** Node.js `createServer` liefert die HTML-Seite unter `/` und den JSON-Zustand unter `/api/state`.
- **WebSocket:** Verwendet die `ws`-Bibliothek. Ein `WebSocketServer` wird an den HTTP-Server angehängt. Bei Verbindung erhält der Client sofort den vollständigen Zustand. Nachfolgende Updates werden als `{ type: "update", event, file, data }`-Nachrichten gepusht.
- **Dateiüberwachung:** Selbes chokidar-Setup wie das Terminal-Dashboard. Dateiänderungen lösen eine `broadcast()`-Funktion aus, die den aktuellen Zustand erstellt und an alle verbundenen WebSocket-Clients sendet.
- **Entprellung:** Updates werden mit 100 ms entprellt, um das Überschwemmen von Clients bei schnellen Dateischreibvorgängen zu vermeiden (z. B. wenn mehrere Agenten gleichzeitig Fortschritt schreiben).
- **Auto-Reconnect:** Der Browser-Client verbindet sich mit exponentiellem Backoff (1 s initial, 1,5x-Multiplikator, 10 s max) wieder, wenn die WebSocket-Verbindung abbricht.
- **Port:** Standard 9847, konfigurierbar über die Umgebungsvariable `DASHBOARD_PORT`.
- **Zustandsaufbau:** Die `buildFullState()`-Funktion aggregiert Sitzungsinformationen, Task-Board, Agentenstatus, Zugzähler und Aktivitäts-Feed bei jedem Update in ein einzelnes JSON-Objekt.
