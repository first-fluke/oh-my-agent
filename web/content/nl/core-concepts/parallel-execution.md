---
title: Parallelle Uitvoering
description: Volledige gids voor het gelijktijdig draaien van meerdere oh-my-agent agenten — agent:spawn syntaxis met alle opties, agent:parallel inline modus, werkruimte-bewuste patronen, multi-CLI configuratie, leveranciersresolutieprioriteit, monitoring met dashboards, sessie-ID strategie en te vermijden anti-patronen.
---

# Parallelle Uitvoering

Het kernvoordeel van oh-my-agent is het gelijktijdig draaien van meerdere gespecialiseerde agenten. Terwijl de backend-agent je API implementeert, maakt de frontend-agent de UI en bouwt de mobile-agent de app-schermen — allemaal gecoordineerd via gedeeld geheugen.

---

## agent:spawn — Enkele Agent Spawnen

### Basissyntaxis

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [opties]
```

### Parameters

| Parameter | Vereist | Beschrijving |
|-----------|---------|-------------|
| `agent-id` | Ja | Agent-identificator: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Ja | Taakbeschrijving (string tussen aanhalingstekens of pad naar een promptbestand) |
| `session-id` | Ja | Groepeert agenten die aan dezelfde functie werken. Formaat: `session-JJJJMMDD-UUMMSS` of een unieke string. |
| `opties` | Nee | Zie optietabel hieronder |

### Opties

| Vlag | Kort | Beschrijving |
|------|------|-------------|
| `--workspace <pad>` | `-w` | Werkdirectory voor de agent. Agenten wijzigen alleen bestanden binnen deze directory. |
| `--model <naam>` | `-m` | Overschrijf CLI-leverancier voor deze specifieke spawn. Opties: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Overschrijf standaard beurtlimiet voor deze agent. |
| `--json` | | Uitvoer als JSON (nuttig voor scripting). |
| `--no-wait` | | Vuur en vergeet — keer onmiddellijk terug zonder te wachten op voltooiing. |

### Voorbeelden

```bash
# Spawn een backend-agent met standaard leverancier
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn met werkruimte-isolatie
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Overschrijf leverancier voor deze specifieke agent
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Stel een hogere beurtlimiet in voor een complexe taak
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Gebruik een promptbestand in plaats van inline tekst
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Parallel Spawnen met Achtergrondprocessen

Om meerdere agenten gelijktijdig te draaien, gebruik shell-achtergrondprocessen:

```bash
# Spawn 3 agenten parallel
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Blokkeer totdat alle agenten klaar zijn
```

### Werkruimte-Bewust Patroon

Wijs altijd gescheiden werkruimten toe bij het parallel draaien van agenten om bestandsconflicten te voorkomen:

```bash
# Full-stack parallelle uitvoering
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Na implementatie, draai QA (sequentieel — afhankelijk van implementatie)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Inline Parallelle Modus

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [opties]
```

### Voorbeelden

```bash
# Basis parallelle uitvoering
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Met no-wait (vuur en vergeet)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Alle agenten delen automatisch dezelfde sessie
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

---

## Multi-CLI Configuratie

```yaml
# .agents/oma-config.yaml
language: en
date_format: "YYYY-MM-DD"
timezone: "Asia/Seoul"
default_cli: gemini

agent_cli_mapping:
  frontend: claude       # Complexe UI-redenering
  backend: gemini        # Snelle API-scaffolding
  mobile: gemini         # Snelle Flutter codegeneratie
  db: gemini             # Snel schemaontwerp
  pm: gemini             # Snelle taakdecompositie
  qa: claude             # Grondige beveiliging en toegankelijkheidsreview
  debug: claude          # Diepgaande oorzaakanalyse
  design: claude         # Genuanceerde ontwerpbeslissingen
  tf-infra: gemini       # HCL-generatie
  dev-workflow: gemini   # Task runner-configuratie
  translator: claude     # Genuanceerde vertaling
  orchestrator: gemini   # Snelle coordinatie
  commit: gemini         # Eenvoudige commitberichtgeneratie
```

### Leveranciersresolutieprioriteit

| Prioriteit | Bron | Voorbeeld |
|------------|------|---------|
| 1 (hoogste) | `--model` vlag | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` in oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` in oma-config.yaml |
| 4 | `active_vendor` | Legacy `cli-config.yaml` instelling |
| 5 (laagste) | Hardgecodeerde fallback | `gemini` |

---

## Leverancierspecifieke Spawnmethoden

| Leverancier | Hoe Agenten Worden Gespawnd | Resultaatafhandeling |
|-------------|---------------------------|---------------------|
| **Claude Code** | `Agent` tool met `.claude/agents/{naam}.md` definities. Meerdere Agent-aanroepen in hetzelfde bericht = echt parallel. | Synchrone return |
| **Codex CLI** | Model-gemedieerde parallelle subagentverzoek | JSON-uitvoer |
| **Gemini CLI** | `oh-my-ag agent:spawn` CLI-commando | MCP geheugen-poll |
| **Antigravity IDE** | `oh-my-ag agent:spawn` alleen | MCP geheugen-poll |
| **CLI Fallback** | `oh-my-ag agent:spawn {agent} {prompt} {session} -w {workspace}` | Resultaatbestand-poll |

---

## Agenten Monitoren

### Terminal Dashboard

```bash
oma dashboard
```

Toont een live tabel met sessie-ID, per-agent status, beurtaantallen, laatste activiteit en verstreken tijd. Bewaakt `.serena/memories/` voor realtime updates.

### Webdashboard

```bash
oma dashboard:web
# Opent http://localhost:9847
```

Functies: realtime updates via WebSocket, auto-reconnect, gekleurde statusindicatoren, activiteitenlogstreaming, sessiegeschiedenis.

### Aanbevolen Terminalindeling

```
┌─────────────────────────┬──────────────────────┐
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Agent spawn        │
│   (live monitoring)     │   commando's         │
├─────────────────────────┴──────────────────────┤
│   Terminal 3:                                  │
│   Test/build logs, git bewerkingen             │
└────────────────────────────────────────────────┘
```

---

## Sessie-ID Strategie

- **Een sessie per functie:** Alle agenten die aan "gebruikersauthenticatie" werken delen `session-auth-01`
- **Formaat:** Beschrijvende ID's: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Automatisch gegenereerd:** Orchestrator genereert `session-JJJJMMDD-UUMMSS` formaat
- **Herbruikbaar voor iteratie:** Gebruik hetzelfde sessie-ID bij herspawns

---

## Tips voor Parallelle Uitvoering

### Wel Doen

1. **Vergrendel eerst API-contracten.** Draai `/plan` voordat je implementatieagenten spawnt.
2. **Gebruik een sessie-ID per functie.**
3. **Wijs gescheiden werkruimten toe.** Gebruik altijd `-w` om agenten te isoleren.
4. **Monitor actief.** Open een dashboardterminal om problemen vroeg te signaleren.
5. **Draai QA na implementatie.** Spawn de QA-agent sequentieel na voltooiing.
6. **Itereer met herspawns.** Herspawn met originele taak plus correctiecontext.
7. **Begin met `/work` als je twijfelt.**

### Niet Doen

1. **Spawn geen agenten in dezelfde werkruimte.** Creert merge-conflicten.
2. **Overschrijd MAX_PARALLEL (standaard 3) niet.**
3. **Sla de planstap niet over.** Leidt tot niet-uitgelijnde implementaties.
4. **Negeer mislukte agenten niet.** Controleer `result-{agent}.md` voor de reden.
5. **Meng geen sessie-ID's voor gerelateerd werk.**

---

## End-to-End Voorbeeld

```bash
# Stap 1: Plan de functie (in je AI IDE, voer /plan uit)

# Stap 2: Spawn implementatieagenten parallel
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Stap 3: Monitor in een aparte terminal
oma dashboard

# Stap 4: Wacht op voltooiing
wait

# Stap 5: Draai QA-review
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Stap 6: Als QA problemen vindt, herspawn specifieke agenten
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Stap 7: Herverifieer
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
