---
title: Gebruiksgids
description: Volledige gebruiksgids met voorbeelden, workflows, dashboardbewerkingen en probleemoplossing.
---

# Hoe Antigravity Multi-Agent Skills te gebruiken

## Snel starten

1. **Open in Antigravity IDE**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **Skills worden automatisch gedetecteerd.** Antigravity scant `.agents/skills/` en indexeert alle beschikbare skills.

3. **Chat in de IDE.** Beschrijf wat je wilt bouwen.

---

## Gebruiksvoorbeelden

### Voorbeeld 1: Eenvoudige enkele-domein taak

**Je typt:**
```
"Maak een loginformulier component met email en wachtwoord velden met Tailwind CSS"
```

**Wat gebeurt er:**
- Antigravity detecteert dat dit overeenkomt met `oma-frontend`
- De skill laadt automatisch (Progressive Disclosure)
- Je krijgt een React component met TypeScript, Tailwind, formuliervalidatie

### Voorbeeld 2: Complex multi-domein project

**Je typt:**
```
"Bouw een TODO app met gebruikersauthenticatie"
```

**Wat gebeurt er:**

1. **Workflow Guide activeert** — detecteert multi-domein complexiteit
2. **PM Agent plant** — creëert taak breakdown met prioriteiten
3. **Je spawnt agents via CLI**:
   ```bash
   oma agent:spawn backend "JWT authenticatie API" session-01 &
   oma agent:spawn frontend "Login en TODO UI" session-01 &
   wait
   ```
4. **Agents werken parallel** — slaan outputs op in Knowledge Base
5. **Jij coördineert** — review `.agents/brain/` voor consistentie
6. **QA Agent reviewt** — beveiliging/prestatie audit
7. **Repareren & itereren** — re-spawn agents met correcties

### Voorbeeld 3: Bug repareren

**Je typt:**
```
"Er is een bug — klikken op login toont 'Cannot read property map of undefined'"
```

**Wat gebeurt er:**

1. **oma-debug activeert** — analyseert fout
2. **Root cause gevonden** — component mapt over `todos` voordat data laadt
3. **Fix geleverd** — loading states en null checks toegevoegd
4. **Regressietest geschreven** — zorgt dat bug niet terugkeert
5. **Vergelijkbare patronen gevonden** — proactief 3 andere components gerepareerd

### Voorbeeld 4: CLI-gebaseerde parallelle uitvoering

```bash
# Enkele agent (workspace automatisch gedetecteerd)
oma agent:spawn backend "Implementeer JWT auth API" session-01

# Parallelle agents
oma agent:spawn backend "Implementeer auth API" session-01 &
oma agent:spawn frontend "Maak loginformulier" session-01 &
oma agent:spawn mobile "Bouw auth schermen" session-01 &
wait
```

**Monitor in realtime:**
```bash
# Terminal (apart terminal venster)
bunx oh-my-agent dashboard

# Of browser
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Realtime dashboards

### Terminal dashboard

```bash
bunx oh-my-agent dashboard
```

Monitort `.serena/memories/` met `fswatch` (macOS) of `inotifywait` (Linux). Toont een live tabel met sessie status, agent states, turns en laatste activiteit. Update automatisch wanneer memory bestanden veranderen.

**Vereisten:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Web dashboard

```bash
npm install          # alleen eerste keer
bunx oh-my-agent dashboard:web
```

Open `http://localhost:9847` in je browser. Functies:

- **Realtime updates** via WebSocket (event-driven, geen polling)
- **Auto-reconnect** als de verbinding verbreekt
- **Serena-themed UI** met paarse accent kleuren
- **Sessie status** — ID en running/completed/failed state
- **Agent tabel** — naam, status (met gekleurde stippen), turn count, taak beschrijving
- **Activiteiten log** — laatste wijzigingen uit progress en result bestanden

De server monitort `.serena/memories/` met chokidar met debounce (100ms). Alleen gewijzigde bestanden triggeren reads — geen volledige re-scan.

---

## Belangrijke concepten

### Progressive Disclosure
Antigravity matcht automatisch verzoeken met skills. Je selecteert nooit handmatig een skill. Alleen de benodigde skill laadt in context.

### Token-geoptimaliseerd skill ontwerp
Elke skill gebruikt een twee-laags architectuur voor maximale token efficiëntie:
- **SKILL.md** (~40 regels): Identiteit, routing, kernregels — direct geladen
- **resources/**: Uitvoeringsprotocollen, voorbeelden, checklists, error playbooks — on-demand geladen

Gedeelde resources leven in `_shared/` (geen skill) en worden gerefereerd door alle agents:
- Chain-of-thought uitvoeringsprotocollen met 4-staps workflow
- Few-shot input/output voorbeelden voor mid-tier model begeleiding
- Error recovery playbooks met "3 strikes" escalatie
- Redenerings templates voor gestructureerde multi-step analyse
- Context budget management voor Flash/Pro model tiers
- Geautomatiseerde verificatie via `verify.sh`
- Cross-session lessen geleerd accumulatie

### CLI agent spawning
Gebruik `oma agent:spawn` om agents via CLI uit te voeren. Respecteert `agent_cli_mapping` in `user-preferences.yaml` om de juiste CLI (gemini, claude, codex, qwen) per agent type te selecteren. Workspace wordt automatisch gedetecteerd uit gemeenschappelijke monorepo conventies, of kan expliciet worden ingesteld met `-w`.

### Knowledge Base
Agent outputs opgeslagen op `.agents/brain/`. Bevat plannen, code, rapporten en coördinatie notities.

### Serena Memory
Gestructureerde runtime state op `.serena/memories/`. De orchestrator schrijft sessie info, task boards, per-agent progress en resultaten. Dashboards monitoren deze bestanden voor monitoring.

### Workspaces
Agents kunnen werken in aparte directories om conflicten te vermijden. Workspace wordt automatisch gedetecteerd uit gemeenschappelijke monorepo conventies:
```
./apps/api   of ./backend   → Backend Agent workspace
./apps/web   of ./frontend  → Frontend Agent workspace
./apps/mobile of ./mobile   → Mobile Agent workspace
```

---

## Beschikbare skills

| Skill | Activeert automatisch voor | Output |
|-------|---------------------------|--------|
| oma-coordination | Complexe multi-domein projecten | Stap-voor-stap agent coördinatie |
| oma-pm | "plan dit", "onderverdelen" | `.agents/plan.json` |
| oma-frontend | UI, components, styling | React components, tests |
| oma-backend | APIs, databases, auth | API endpoints, modellen, tests |
| oma-mobile | Mobiele apps, iOS/Android | Flutter schermen, state management |
| oma-brainstorm | Ideevorming, conceptverkenning | Ontwerpdocument |
| oma-db | Database, schema, ERD, migratie | Schemaontwerp, queryoptimalisatie |
| oma-dev-workflow | CI/CD, git hooks, monorepo-setup | Workflowconfiguraties, automatisering |
| oma-tf-infra | Terraform, cloudinfrastructuur | IaC-modules, state-management |
| oma-translator | Vertaling, meertalige content | Vertaalde tekst met behoud van toon |
| oma-qa | "review beveiliging", "audit" | QA rapport met geprioritiseerde fixes |
| oma-debug | Bug rapporten, foutmeldingen | Gerepareerde code, regressietests |
| oma-orchestrator | CLI sub-agent uitvoering | Resultaten in `.agents/results/` |
| oma-commit | "commit", "wijzigingen opslaan" | Git commits (auto-splits per feature) |

---

## Workflow commando's

Typ deze in Antigravity IDE chat om stap-voor-stap workflows te triggeren:

| Commando | Beschrijving |
|----------|--------------|
| `/brainstorm` | Design-first ideevorming en conceptverkenning |
| `/coordinate` | Multi-agent orkestratie via CLI met stap-voor-stap begeleiding |
| `/deepinit` | Diepgaande projectinitialisatie met hiërarchische AGENTS.md |
| `/exec-plan` | Planuitvoering en inline planbeheer |
| `/orchestrate` | Geautomatiseerde CLI-gebaseerde parallelle agent uitvoering |
| `/plan` | PM taak decompositie met API contracten |
| `/review` | Volledige QA pipeline (beveiliging, prestaties, toegankelijkheid, code kwaliteit) |
| `/debug` | Gestructureerd bug repareren (reproduceren → diagnosticeren → repareren → regressietest) |
| `/setup` | CLI- en MCP-configuratie |
| `/tools` | MCP tool management |
| `/ultrawork` | Maximale parallelle uitvoering via 5-fase gate-lus |

Deze zijn gescheiden van **skills** (die automatisch activeren). Workflows geven je expliciete controle over multi-step processen.

---

## Typische workflows

### Workflow A: Enkele skill

```
Jij: "Maak een knop component"
  → Antigravity laadt oma-frontend
  → Krijg component direct
```

### Workflow B: Multi-agent project (automatisch)

```
Jij: "Bouw een TODO app met authenticatie"
  → oma-coordination activeert automatisch
  → PM Agent creëert plan
  → Jij spawnt agents via CLI (oma agent:spawn)
  → Agents werken parallel
  → QA Agent reviewt
  → Repareer problemen, itereer
```

### Workflow B-2: Multi-agent project (expliciet)

```
Jij: /coordinate
  → Stap-voor-stap begeleide workflow
  → PM planning → plan review → agent spawning → monitoring → QA review
```

### Workflow C: Bug repareren

```
Jij: "Login knop gooit TypeError"
  → oma-debug activeert
  → Root cause analyse
  → Fix + regressietest
  → Vergelijkbare patronen gecontroleerd
```

### Workflow D: CLI orkestratie met dashboard

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "taak" session-01 &
            oma agent:spawn frontend "taak" session-01 &
Browser:    http://localhost:9847 → realtime status
```

---

## Tips

1. **Wees specifiek** — "Bouw een TODO app met JWT auth, React frontend, FastAPI backend" is beter dan "maak een app"
2. **Gebruik CLI spawning** voor multi-domein projecten — probeer niet alles in één chat te doen
3. **Review Knowledge Base** — controleer `.agents/brain/` voor API consistentie
4. **Itereer met re-spawns** — verfijn instructies, begin niet opnieuw
5. **Gebruik dashboards** — `bunx oh-my-agent dashboard` of `bunx oh-my-agent dashboard:web` om orchestrator sessies te monitoren
6. **Aparte workspaces** — wijs elke agent zijn eigen directory toe

---

## Probleemoplossing

| Probleem | Oplossing |
|----------|-----------|
| Skills laden niet | `antigravity open .`, controleer `.agents/skills/`, herstart IDE |
| CLI niet gevonden | Controleer `which gemini` / `which claude`, installeer ontbrekende CLIs |
| Incompatibele agent outputs | Review beide in Knowledge Base, re-spawn met correcties |
| Dashboard: "No agents" | Memory bestanden nog niet aangemaakt, voer orchestrator eerst uit |
| Web dashboard start niet | Voer `npm install` uit om chokidar en ws te installeren |
| fswatch niet gevonden | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| QA rapport heeft 50+ problemen | Focus op CRITICAL/HIGH eerst, documenteer rest voor later |

---

## CLI commando's

```bash
bunx oh-my-agent                # Interactieve skill installer
bunx oh-my-agent doctor         # Controleer setup & repareer ontbrekende skills
bunx oh-my-agent doctor --json  # JSON output voor CI/CD
bunx oh-my-agent update         # Update skills naar laatste versie
bunx oh-my-agent stats          # Bekijk productiviteitsmetrieken
bunx oh-my-agent stats --reset  # Reset metrieken
bunx oh-my-agent retro          # Sessie retrospective (lessen & volgende stappen)
bunx oh-my-agent dashboard      # Terminal realtime dashboard
bunx oh-my-agent dashboard:web  # Web dashboard (http://localhost:9847)
bunx oh-my-agent help           # Toon help
```

---

## Voor ontwikkelaars (integratiegids)

Als je deze skills wilt integreren in je bestaande Antigravity project, zie [AGENT_GUIDE.md](../AGENT_GUIDE.md) voor:
- Snelle 3-staps integratie
- Volledige dashboard integratie
- Skills aanpassen voor jouw tech stack
- Probleemoplossing en best practices

---

**Chat gewoon in Antigravity IDE.** Voor monitoring, gebruik de dashboards. Voor CLI uitvoering, gebruik de orchestrator scripts. Om te integreren in je bestaande project, zie [AGENT_GUIDE.md](../AGENT_GUIDE.md).
