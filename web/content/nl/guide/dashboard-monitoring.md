---
title: "Gids: Dashboard Monitoring"
description: Uitgebreide dashboardgids met terminal- en webdashboards, databronnen, 3-terminal layout, probleemoplossing en technische implementatiedetails.
---

# Gids: Dashboard Monitoring

## Twee Dashboard-Commando's

| Commando | Interface | URL | Technologie |
|:---------|:---------|:----|:-----------|
| `oma dashboard` | Terminal (TUI) | N/B — rendert in je terminal | chokidar file watcher, picocolors rendering |
| `oma dashboard:web` | Browser | `http://localhost:9847` | HTTP-server, WebSocket, chokidar file watcher |

Beide dashboards bewaken dezelfde databron: `.serena/memories/`-directory.

### Terminal Dashboard

```bash
oma dashboard
```

Rendert een box-drawing UI direct in de terminal. Wordt automatisch bijgewerkt bij geheugenbestandswijzigingen. Druk `Ctrl+C` om af te sluiten.

**Statussymbolen:** `●` (groen) draaiend, `✓` (cyaan) voltooid, `✗` (rood) mislukt, `○` (geel) geblokkeerd, `◌` (gedimd) wachtend.

### Webdashboard

```bash
oma dashboard:web
```

Opent een webserver op poort 9847 (configureerbaar via `DASHBOARD_PORT`). De browser-UI verbindt via WebSocket en ontvangt live updates.

```bash
DASHBOARD_PORT=8080 oma dashboard:web
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

---

## Aanbevolen 3-Terminal Layout

```
┌────────────────────────────────┬────────────────────────────────┐
│   Terminal 1: Hoofdagent       │   Terminal 2: Dashboard        │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
├────────────────────────────────┴────────────────────────────────┤
│   Terminal 3: Ad-hoc commando's                                 │
│   $ oma agent:status session-id backend frontend                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Databronnen in .serena/memories/

| Bestandspatroon | Aangemaakt Door | Inhoud |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Stap 2 | Sessie-ID, starttijd, status, workflowversie |
| `task-board.md` | Orchestratieworkflows | Markdown-tabel met agenttoewijzingen en statussen |
| `progress-{agent}.md` | Elke gespawnde agent | Huidig beurtnummer, huidige actie, tussenresultaten |
| `result-{agent}.md` | Elke voltooide agent | Eindstatus, gewijzigde bestanden, gevonden problemen |
| `experiment-ledger.md` | Quality Score-systeem | Experimentbijhouding: basislijnscores, delta's, behoud/verwerp beslissingen |

---

## Probleemoplossing

### Signaal 1: Agent Toont "draaiend" maar Geen Beurtvoortgang
**Acties:** Controleer logbestand: `cat /tmp/subagent-{session-id}-{agent-id}.log`. Controleer of proces draait: `oma agent:status`. Herspawn indien gecrasht.

### Signaal 2: Agent Toont "gecrasht"
**Acties:** Controleer logbestand, verifieer CLI-installatie met `oma doctor`, controleer authenticatie met `oma auth:status`, herspawn.

### Signaal 3: Dashboard Toont "Geen agenten gedetecteerd"
**Acties:** Verifieer memories-directory: `ls -la .serena/memories/`, controleer of workflow nog in planningsfase is.

### Signaal 4: Webdashboard Toont "Verbinding verbroken"
**Acties:** Controleer of dashboardproces draait, probeer andere poort: `DASHBOARD_PORT=8080 oma dashboard:web`. Auto-reconnect met exponential backoff (1s initieel, max 10s).

---

## Pre-Merge Monitoringchecklist

- [ ] Alle agenten tonen "voltooid"
- [ ] Geen agenten tonen "mislukt"
- [ ] QA-agent heeft review voltooid
- [ ] Nul CRITICAL/HIGH bevindingen
- [ ] Sessiestatus is VOLTOOID
- [ ] Activiteitenfeed toont eindrapport

---

## Technische Details

### Terminal Dashboard
- **Bestandsbewaking:** chokidar met `awaitWriteFinish` (200ms stabiliteitsdrempel)
- **Rendering:** Wist en hertekent hele terminal bij elke wijziging. Gebruikt `picocolors` voor ANSI-kleuren en Unicode box-drawing
- **Afsluiten:** Vangt `SIGINT` en `SIGTERM`, sluit watcher netjes af

### Webdashboard
- **HTTP-server:** Node.js `createServer` serveert HTML op `/` en JSON-status op `/api/state`
- **WebSocket:** `ws`-bibliotheek. Bij verbinding ontvangt client volledige status. Updates als `{ type: "update", event, file, data }`
- **Debouncing:** 100ms om clients niet te overspoelen bij snelle bestandsschrijfacties
- **Auto-reconnect:** Exponential backoff (1s initieel, 1.5x vermenigvuldiger, 10s max)
- **Poort:** Standaard 9847, configureerbaar via `DASHBOARD_PORT`
