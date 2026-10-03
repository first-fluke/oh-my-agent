---
title: Parallelle uitvoering
description: Meerdere OMA-dispatchrollen parallel uitvoeren met de actuele CLI-syntax, taakbestanden, inline-modus, werkruimte-isolatie, model- en vendorresolutie, monitoring, sessie-ID's en herstelpatronen.
---

# Parallelle uitvoering

Het belangrijkste voordeel van oh-my-agent is dat je meerdere gespecialiseerde agenten tegelijk kunt uitvoeren. Terwijl de backend-agent een API implementeert, maakt de frontend-agent de UI en bouwt de mobile-agent appschermen; de orchestrator coördineert ze via duurzame runstate en receipts.

---

## agent:spawn: één agent spawnen

### Basissyntax

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Parameters

| Parameter | Verplicht | Beschrijving |
|-----------|----------|-------------|
| `agent-id` | Ja | Canonieke dispatchrol: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` of `explore` |
| `prompt` | Ja | Taakomschrijving (tussen quotes of een pad naar een promptbestand) |
| `session-id` | Ja | Groepeert agenten die aan dezelfde feature werken. Formaat: `session-YYYYMMDD-HHMMSS` of een andere unieke string. |
| `options` | Nee | Zie de optietabel hieronder |

### Opties

| Flag | Kort | Beschrijving |
|-------|-------|-------------|
| `--workspace <path>` | `-w` | Werkdirectory voor de agent. Agenten wijzigen alleen bestanden binnen deze directory. |
| `--vendor <vendor>` | | Overschrijf de CLI-vendor voor deze spawn (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` of `pi`). |
| `--resumed-from <run-id>` | | Koppel een retry aan de voorafgaande run met evidence. |
| `--fallback-vendors <vendors>` | | Geordende, komma-gescheiden vendor-fallbacks wanneer de primaire vendor niet kan draaien. |
| `--task-id <id>` | | Koppel de spawn aan een task-ID uit het sessieplan. |
| `--isolation <mode>` | | `worktree` maakt een verse git-worktree onder de tijdelijke OMA-worktreemap. De worktree blijft beschikbaar voor review en samenvoegen/weggooien. |
| `--read-only` | | Beperk de gespawnde agent tot niet-destructieve tools. |

### Voorbeelden

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Parallel spawnen met achtergrondprocessen

Meerdere agenten tegelijk uitvoeren kan met shell-backgroundprocessen:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Met `&` draait elke agent op de achtergrond. `wait` blokkeert totdat alle achtergrondprocessen klaar zijn.

### Werkruimtebewust patroon {#workspace-aware-pattern}

Wijs bij parallelle agenten altijd aparte werkruimtes toe om bestandsconflicten te voorkomen:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel: inline parallelle modus

Voor een kortere syntax die het beheer van backgroundprocessen automatisch afhandelt:

### Syntax

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Voorbeelden

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

De vlag `--inline` parseert elk argument `agent:task`. Voeg een derde, door dubbele punten gescheiden pad (`agent:task:workspace`) toe wanneer de taak een specifieke werkruimte nodig heeft. Zonder `--inline` geef je een YAML-taskbestand door met `{tasks: [{id?, agent, task, workspace?}]}`. Met `--session` koppel je parallelle resultaten aan een bestaande sessie.

---

## Multi-CLI-configuratie

oh-my-agent routeert elke agent via `model_preset` in `.agents/oma-config.yaml` naar de passende CLI. Kies een ingebouwde preset voor de vendor die je gebruikt en overschrijf eventueel individuele agenten.

### Configuratievoorbeeld

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Ingebouwde presets: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` en `mixed`. Zie [Per-Agent Models](../guide/per-agent-models.md) voor details.

### Vendorresolutie

Wanneer `oma agent spawn` bepaalt welke CLI wordt gebruikt:

| Prioriteit | Bron | Voorbeeld |
|---------|------|---------|
| 1 (hoogst) | `--vendor`-vlag | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | `agents:`-override in `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | Standaardagenten van actieve `model_preset` | preset-lookup voor de agentrol |

De vlag `--vendor` wint altijd. Zonder vlag controleert het systeem eerst overrides onder `agents:`, daarna de presetdefaults en daarna de geconfigureerde fallback-CLI. Met `model_preset: auto` leveren de native settings van de huidige runtime het model.

---

## Vendor-specifieke spawnmethoden

De spawnmechaniek verschilt per IDE/CLI:

| Vendor | Hoe agenten worden gespawnd | Resultaatverwerking |
|---------|----------------------|-----------------|
| **Claude Code** | Taken binnen dezelfde vendor gebruiken de Agent-tool met `.claude/agents/{name}.md`; cross-vendor taken vallen terug op `oma agent spawn`. | Synchrone return |
| **Codex CLI** | Taken binnen dezelfde vendor gebruiken native custom agents uit `.codex/agents/{name}.toml`; cross-vendor taken vallen terug op `oma agent spawn`. | JSON-output |
| **Antigravity CLI/IDE** | `oma agent spawn` via de `agy`-runtime; native custom subagenten zijn niet vereist | Duurzame receipt en poll van resultaatbestand |
| **Cursor** | Gebruikt waar beschikbaar de gegenereerde Cursor-integratie; anders `oma agent spawn` | Poll van resultaatbestand |
| **OpenCode / pi** | Gebruikt de in-process extension bridge wanneer geselecteerd; cross-vendor werk gebruikt `oma agent spawn` | Poll van resultaatbestand |
| **CLI-fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Evidence-backed result poll |

Binnen Claude Code gebruikt de workflow direct de `Agent`-tool:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Meerdere Agent-tool-calls in hetzelfde bericht draaien echt parallel, zonder sequentieel te wachten.

Dezelfde dispatchregel geldt voor alle vendors:

1. Los `target_vendor_for_agent` op uit `.agents/oma-config.yaml`.
2. Komt die overeen met de vendor van de huidige runtime, gebruik dan het native agentbestand van die vendor.
3. Komt die niet overeen, gebruik dan alleen voor die agent `oma agent spawn`.

---

## Agenten monitoren

### Terminaldashboard

```bash
oma dashboard terminal
```

Toont een live tabel met:
- Sessie-ID en algemene status
- Status per agent (running, completed, failed)
- Beurtenaantallen
- Laatste activiteit uit progressbestanden
- Verstreken tijd

Het dashboard bewaakt `.agents/state/memories/` op realtime updates. Het ververst wanneer agenten voortgang schrijven.

### Webdashboard

```bash
oma dashboard web
# Opens http://localhost:9847
```

Mogelijkheden:
- Realtime updates via WebSocket
- Automatisch opnieuw verbinden na verbroken verbindingen
- Gekleurde statusindicatoren voor agenten
- Activity-log streaming uit progress- en resultaatbestanden
- Sessiegeschiedenis

### Aanbevolen terminalindeling

Gebruik 3 terminals voor goed zicht:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Individuele agentstatus controleren

```bash
oma agent status <session-id> <agent-id>
```

Geeft de actuele status van een agent: running, completed of failed, plus het aantal beurten en de laatste activiteit.

---

## Sessie-ID-strategie

Sessie-ID's groeperen agenten die aan dezelfde feature werken. Best practices:

- **Eén sessie per feature:** alle agenten voor "user authentication" delen `session-auth-01`
- **Formaat:** gebruik beschrijvende ID's: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Automatisch gegenereerd:** de orchestrator maakt ID's in formaat `session-YYYYMMDD-HHMMSS`
- **Herbruikbaar voor iteratie:** gebruik dezelfde sessie-ID wanneer je agenten opnieuw spawnt voor verfijningen

Sessie-ID's bepalen:
- welke rungebonden geheugenbestanden agenten lezen en schrijven (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`);
- wat het dashboard bewaakt;
- hoe resultaten in het eindrapport worden gegroepeerd.

---

## Tips voor parallelle uitvoering

### Wel doen

1. **Leg API-contracten eerst vast.** Draai `/plan` vóór je implementatieagenten spawnt, zodat frontend- en backendagenten endpoints, request/response-schema's en foutformaten delen.

2. **Gebruik één sessie-ID per feature.** Zo blijven agentoutput en dashboardmonitoring samenhangend.

3. **Wijs aparte werkruimtes toe.** Gebruik altijd `-w` om agenten te isoleren:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitor actief.** Open een dashboardterminal om problemen vroeg te zien; een falende agent verspilt beurten als je hem niet snel opmerkt.

5. **Draai QA na implementatie.** Spawn de QA-agent sequentieel wanneer alle implementatieagenten klaar zijn:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Itereer met respawns.** Als output verfijning nodig heeft, spawn je de agent opnieuw met de oorspronkelijke taak plus correctiecontext. Begin geen nieuwe sessie.

7. **Start bij twijfel met `/work`.** De work-workflow begeleidt je stap voor stap, met gebruikersbevestiging bij elke poort.

### Niet doen

1. **Spawn geen agenten in dezelfde werkruimte.** Twee agenten die dezelfde directory schrijven maken mergeconflicten en overschrijven elkaars werk.

2. **Overschrijd MAX_PARALLEL niet (standaard 3).** Meer gelijktijdige agenten zijn niet altijd sneller. De standaard 3 is voor de meeste systemen afgestemd.

3. **Sla de planstap niet over.** Agenten spawnen zonder plan leidt tot misalignment, bijvoorbeeld wanneer frontend en backend verschillende API-vormen bouwen.

4. **Negeer mislukte agenten niet.** Het werk van een mislukte agent is onvolledig. Controleer de gestructureerde claim of het rungebonden resultaatbestand, herstel de reden en spawn opnieuw.

5. **Meng sessie-ID's voor gerelateerd werk niet.** Backend- en frontendagenten voor dezelfde feature moeten één sessie-ID delen zodat de orchestrator kan coördineren.

---

## End-to-end voorbeeld

Een complete parallelle workflow voor een authenticatiefunctie:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
