---
title: "Gids: Dashboardmonitoring"
sidebar_label: Dashboardmonitoring
description: Monitor OMA-sessies vanuit de terminal of een webdashboard op loopback, kies de statedirectory en herstel veelvoorkomende verbindings- en discoveryproblemen.
---

# Dashboardmonitoring

## Twee dashboardcommando's

oh-my-agent biedt twee realtime dashboards om agentactiviteit tijdens multi-agentworkflows te volgen.

| Commando | Interface | URL | Technologie |
|:---------|:----------|:----|:------------|
| `oma dashboard terminal` | Terminal (TUI) | N.v.t. (wordt in je terminal weergegeven) | chokidar-bestandswatcher, picocolors-rendering |
| `oma dashboard web` | Browser | `http://127.0.0.1:9847` (token wordt bij het opstarten afgedrukt) | HTTP-server, WebSocket, chokidar-bestandswatcher |

Beide dashboards bewaken standaard `.agents/state/memories/`. Stel `MEMORIES_DIR` in wanneer de coördinatiebestanden ergens anders staan. Het dashboard valt niet automatisch terug op `.serena/memories/`.

### Terminaldashboard

```bash
oma dashboard terminal
```

Toont rechtstreeks in de terminal een UI met box-drawingtekens. De weergave wordt automatisch bijgewerkt wanneer memorybestanden veranderen. Druk op `Ctrl+C` om af te sluiten.

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

**Statussymbolen:**

- `●` (groen): bezig
- `✓` (cyaan): voltooid
- `✗` (rood): mislukt
- `○` (geel): geblokkeerd
- `◌` (gedimd): in afwachting

### Webdashboard

```bash
oma dashboard web
```

Start een webserver die alleen op loopback luistert op poort 9847 (configureerbaar via `DASHBOARD_PORT`). OMA toont een URL met `127.0.0.1`; open de exacte URL en bewaar het token. De pagina gebruikt het token voor `/api/state`, `/api/recap` en WebSocket-updates. Requests zonder token geven `401` terug.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```

Het webdashboard toont dezelfde informatie als het terminaldashboard, maar in een vormgegeven UI met donker thema en:

- Verbindingsstatusbadge (Connected / Disconnected / Connecting met automatisch opnieuw verbinden)
- Sessie-ID en statusbalk
- Agentstatustabel met geanimeerde statuspunten
- Feed met recente activiteit
- Automatisch bijgewerkte tijdstempels

---

## Aanbevolen indeling met 3 terminals

Voor multi-agentworkflows is een opstelling met drie terminalpanelen aanbevolen:

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

**Terminal 1** draait je primaire agentsessie (Gemini CLI, Claude Code, Codex enzovoort), waarin je met workflows zoals `/orchestrate` of `/work` werkt.

**Terminal 2** draait het dashboard voor passieve monitoring. Het wordt automatisch bijgewerkt en vereist geen interactie.

**Terminal 3** is bedoeld voor ad-hoccommando's: agentstatus controleren, verificaties uitvoeren, statistieken bekijken of problemen debuggen.

---

## Databronnen in `.agents/state/memories/`

De dashboards lezen uit de directory `.agents/state/memories/`. Agents en workflows vullen deze directory tijdens de uitvoering met coördinatiebestanden. Gebruik `MEMORIES_DIR` voor een project waarvan de state ergens anders staat.

### Bestandstypen en hun inhoud

| Bestandspatroon | Aangemaakt door | Inhoud |
|:----------------|:----------------|:-------|
| `orchestrator-session.md` | `/orchestrate` stap 2 | Sessie-ID, starttijd, status (RUNNING/COMPLETED/FAILED), workflowversie |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Sessiemetadata, fasevoortgang, samenvatting van het gebruikersverzoek |
| `task-board.md` | Orchestratieworkflows | Markdown-tabel met agenttoewijzingen, statussen en taken |
| `progress-{agent}.md` | Elke gestarte agent | Huidige beurt, waaraan de agent werkt en tussentijdse resultaten |
| `result-{agent}.md` | Elke voltooide agent | Eindstatus (COMPLETED/FAILED), gewijzigde bestanden, gevonden problemen en deliverables |
| `debug-{id}.md` | `/debug`-workflow | Bugdiagnose, hoofdoorzaak, toegepaste fix en locatie van de regressietest |
| `experiment-ledger-{sessionId}.md` | Daadwerkelijke experimenten | Vergelijkbare evidence voor baseline en kandidaat, vereiste checks en beslissingen |
| `lessons-{sessionId}.md` | Wanneer evidence een herbruikbare oorzaak onderbouwt | Lessen per sessie; geen generatie die door een score wordt geactiveerd |

### Hoe het dashboard leest

Het dashboard gebruikt meerdere strategieën om informatie uit te lezen:

1. **Sessie detecteren:** Leest eerst `orchestrator-session.md` en valt daarna terug op het meest recent gewijzigde `session-*.md`-bestand. De status wordt uit trefwoorden gehaald: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.
2. **Task board parseren:** Leest `task-board.md` als Markdown-tabel. Haalt agentnaam, status en taakomschrijving uit de kolommen.
3. **Agents ontdekken:** Als er geen task board is, zoekt het in alle `.md`-bestanden naar patronen als `**Agent**: {name}`, regels als `Agent: {name}` of bestandsnamen met `_agent` of `-agent`.
4. **Beurten tellen:** Leest voor elke gevonden agent `progress-{agent}.md` en haalt het aantal beurten uit patronen als `turn: N`.
5. **Activiteitsfeed:** Toont de 5 meest recent gewijzigde `.md`-bestanden en haalt daaruit de laatste betekenisvolle regel (heading, statusregel, actiepunt) als activiteitsbericht. Het webdashboard stelt de recapweergave ook beschikbaar op `/recap`.

---

## Wat elk dashboard toont

### Sessiestatus

Het bovenste gedeelte toont:

- **Sessie-ID:** Afkomstig uit sessiebestanden (vorm `session-YYYYMMDD-HHMMSS`).
- **Status:** Kleurgecodeerd: groen voor RUNNING, cyaan voor COMPLETED, rood voor FAILED en geel voor UNKNOWN.

### Task board

De agenttabel toont elke gedetecteerde agent met:

- **Agentnaam:** De domeinidentifier (backend, frontend, mobile, qa, debug, pm).
- **Status:** De huidige toestand met visuele indicator (running/completed/failed/blocked/pending).
- **Beurt:** Het huidige beurtgetal van de agent (hoeveel iteraties zijn voltooid). Dit wordt uit progressbestanden gehaald.
- **Taak:** Een korte beschrijving van waaraan de agent werkt (afgekapt om te passen).

### Agentvoortgang

Voortgang wordt bijgehouden via `progress-{agent}.md`-bestanden. Elke agent werkt zijn bestand bij tijdens de uitvoering. Het dashboard leest daaruit:

- Het aantal beurten (neemt toe naarmate de agent vordert).
- De huidige actie (waaraan de agent nu werkt).
- Tussentijdse resultaten (gedeeltelijke voltooiingen).

### Resultaten

Wanneer een agent klaar is, schrijft die `result-{agent}.md` met:

- Eindstatus (COMPLETED of FAILED).
- Lijst met gewijzigde bestanden.
- Opgetreden problemen.
- Geproduceerde deliverables.

Het dashboard detecteert voltooiing zodra dit bestand bestaat en werkt de agentstatus bij.

---

## Runbook voor probleemoplossing

### Signaal 1: agent toont "running" maar het beurtgetal verandert niet

**Symptoom:** Het dashboard toont een agent als running, maar het beurtgetal is al enkele minuten niet veranderd.

**Mogelijke oorzaken:**

- De agent zit vast in een lange bewerking (grote codebasescan, trage API-call).
- De agent is gecrasht maar het PID-bestand bestaat nog.
- De agent wacht op gebruikersinvoer (dit hoort niet te gebeuren in auto-approve-modus).

**Acties:**

1. Controleer het logbestand van de agent: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Controleer of het proces werkelijk draait: `oma agent status {session-id} {agent-id}`
3. Als het proces niet draait maar de status "running" toont, is de agent gecrasht. Start opnieuw met foutcontext.

### Signaal 2: agent toont "crashed"

**Symptoom:** `oma agent status` geeft `crashed` terug voor een agent.

**Mogelijke oorzaken:**

- Het CLI-vendorproces is onverwacht gestopt (out of memory, API-quota overschreden, netwerktimeout).
- De workspacedirectory is verwijderd of de rechten zijn gewijzigd.
- De vendor-CLI is niet geïnstalleerd of niet geauthenticeerd.

**Acties:**

1. Controleer het logbestand op foutdetails: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Controleer de CLI-installatie: `oma doctor`
3. Controleer authenticatie: `oma auth status`
4. Start opnieuw met dezelfde taak: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signaal 3: dashboard toont "nog geen agents gedetecteerd"

**Symptoom:** Het dashboard draait maar toont geen agents.

**Mogelijke oorzaken:**

- De workflow heeft de stap voor het starten van agents nog niet bereikt.
- De directory `.agents/state/memories/` is leeg.
- Het dashboard bewaakt de verkeerde directory.

**Acties:**

1. Controleer de memorydirectory: `ls -la .agents/state/memories/`
2. Controleer of de workflow nog in de planningsfase zit (agents zijn nog niet gestart).
3. Controleer of het dashboard de juiste projectdirectory bewaakt: het dashboard bepaalt het memorypad vanuit de huidige werkdirectory.
4. Bij een aangepast pad: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Signaal 4: webdashboard toont "verbinding verbroken"

**Symptoom:** De verbindingsbadge van het webdashboard is rood en toont "Disconnected".

**Mogelijke oorzaken:**

- Het proces `oma dashboard web` is beëindigd.
- De browser gebruikt een verouderde URL of mist het starttoken.
- De poort is al in gebruik door een ander proces.

**Acties:**

1. Controleer of het dashboardproces draait: `ps aux | grep dashboard`
2. Open opnieuw de exacte token-URL die het proces afdrukte; verwijder het token niet.
3. Probeer een andere poort: `DASHBOARD_PORT=8080 oma dashboard web`
4. Controleer of de poort beschikbaar is: `lsof -i :9847`
5. Het webdashboard maakt automatisch opnieuw verbinding met exponential backoff (start bij 1 s, maximaal 10 s). Wacht enkele seconden op de reconnect.

---

## Checklist voor monitoring vóór de merge

Controleer vóór je een multi-agentsessie als voltooid beschouwt via het dashboard:

- [ ] **Alle agents tonen "completed":** Geen agents blijven hangen in de status "running" of "blocked".
- [ ] **Geen agents tonen "failed":** Controleer bij een mislukte agent de logs en start opnieuw.
- [ ] **QA-agent heeft de review voltooid:** Zoek naar `result-qa-agent.md` of `result-qa.md`.
- [ ] **Nul CRITICAL/HIGH-bevindingen:** Controleer de ernstentellingen in het QA-resultaat.
- [ ] **Sessiestatus is COMPLETED:** Het sessiebestand moet de eindstatus tonen.
- [ ] **Activiteitsfeed toont het eindrapport:** De laatste activiteit hoort het samenvattende rapport te zijn.

---

## Gereedcriteria

Dashboardmonitoring is klaar wanneer:

1. Alle gestarte agents een eindtoestand hebben bereikt (voltooid of mislukt en afgehandeld).
2. De QA-reviewcyclus is afgerond zonder blokkerende problemen.
3. De sessiestatus de einduitkomst weergeeft.
4. Resultaten in memory zijn vastgelegd voor toekomstig gebruik.

---

## Technische details

### Terminaldashboard (`oma dashboard terminal`)

- **Bestandsbewaking:** Gebruikt [chokidar](https://github.com/paulmillr/chokidar) met `awaitWriteFinish` (stabiliteitsdrempel 200 ms, pollinterval 50 ms) om gedeeltelijk geschreven bestanden niet te renderen.
- **Rendering:** Wist de terminal en tekent het volledige dashboard opnieuw bij elke bestandswijziging. Gebruikt `picocolors` voor ANSI-kleurweergave en Unicode box-drawingtekens voor de rand.
- **Memorydirectory:** Wordt bepaald door `MEMORIES_DIR`, daarna het dashboard-CLI-argument wanneer dat is opgegeven, en daarna `{cwd}/.agents/state/memories`.
- **Netjes afsluiten:** Vangt `SIGINT` en `SIGTERM` op, sluit de chokidar-watcher en sluit netjes af.

### Webdashboard (`oma dashboard web`)

- **HTTP-server:** Node.js `createServer` serveert de HTML-pagina op `/`, de recap-pagina op `/recap`, JSON-state op `/api/state` en recapdata op `/api/recap`. De server bindt aan `127.0.0.1`.
- **WebSocket:** Gebruikt de `ws`-library. Een verbinding vanaf loopback-origin moet het processtoken in de querystring meesturen. Bij verbinding ontvangt de client onmiddellijk de volledige state. Daarna worden updates als `{ type: "update", event, file, data }`-berichten gepusht.
- **Bestandsbewaking:** Gebruikt dezelfde chokidar-configuratie als het terminaldashboard. Bestandswijzigingen activeren `broadcast()`, dat de huidige state opbouwt en die naar alle verbonden WebSocket-clients stuurt.
- **Debouncing:** Updates worden 100 ms uitgesteld om een overvloed aan updates te voorkomen bij snelle schrijfacties, bijvoorbeeld wanneer meerdere agents tegelijk voortgang schrijven.
- **Automatisch opnieuw verbinden:** De browserclient verbindt opnieuw met exponential backoff (eerste vertraging 1 s, vermenigvuldigingsfactor 1,5, maximum 10 s) wanneer de WebSocketverbinding wegvalt.
- **Poort:** Standaard 9847, configureerbaar via `DASHBOARD_PORT`. API-requests accepteren `X-OMA-Dashboard-Token` of `?token=...`; ontbrekende of ongeldige tokens geven `401`.
- **State opbouwen:** `buildFullState()` voegt sessie-informatie, task board, agentstatus, beurtentellingen en activiteitsfeed samen tot één JSON-object bij elke update.
