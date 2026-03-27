---
title: Exécution Parallèle
description: Guide complet pour exécuter plusieurs agents oh-my-agent simultanément — syntaxe agent:spawn avec toutes les options, mode inline agent:parallel, patterns avec workspace, configuration multi-CLI, priorité de résolution de fournisseur, surveillance avec dashboards, stratégie d'ID de session et anti-patterns à éviter.
---

# Exécution Parallèle

L'avantage fondamental d'oh-my-agent est l'exécution simultanée de plusieurs agents spécialisés. Pendant que l'agent backend implémente votre API, l'agent frontend crée l'interface utilisateur et l'agent mobile construit les écrans de l'application -- le tout coordonné via la mémoire partagée.

---

## agent:spawn -- Lancement d'un agent unique

### Syntaxe de base

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### Paramètres

| Parameter | Required | Description |
|-----------|----------|-------------|
| `agent-id` | Yes | Agent identifier: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Yes | Task description (quoted string or path to a prompt file) |
| `session-id` | Yes | Groups agents working on the same feature. Format: `session-YYYYMMDD-HHMMSS` or any unique string. |
| `options` | No | See options table below |

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Working directory for the agent. Agents only modify files within this directory. |
| `--model <name>` | `-m` | Override CLI vendor for this specific spawn. Options: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Override default turn limit for this agent. |
| `--json` | | Output result as JSON (useful for scripting). |
| `--no-wait` | | Fire and forget — return immediately without waiting for completion. |

### Exemples

```bash
# Spawn a backend agent with default vendor
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override vendor for this specific agent
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Set a higher turn limit for a complex task
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Use a prompt file instead of inline text
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Lancement parallèle avec des processus en arrière-plan

Pour exécuter plusieurs agents simultanément, utilisez des processus shell en arrière-plan :

```bash
# Spawn 3 agents in parallel
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Le `&` exécute chaque agent en arrière-plan. `wait` bloque jusqu'à ce que tous les processus en arrière-plan soient terminés.

### Pattern avec gestion des workspaces

Assignez toujours des workspaces séparés lorsque vous exécutez des agents en parallèle pour éviter les conflits de fichiers :

```bash
# Full-stack parallel execution
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential — depends on implementation)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel -- Mode parallèle en ligne

Pour une syntaxe plus propre qui gère automatiquement les processus en arrière-plan :

### Syntaxe

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### Exemples

```bash
# Basic parallel execution
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# With no-wait (fire and forget)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# All agents share the same session automatically
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

Le flag `-i` (inline) permet de spécifier les paires agent-prompt directement dans la commande.

---

## Configuration multi-CLI

Tous les CLI IA ne se valent pas selon les domaines. oh-my-agent vous permet de router les agents vers le CLI qui gère le mieux leur domaine.

### Exemple de configuration complète

```yaml
# .agents/config/user-preferences.yaml

# Response language
language: en

# Date format for reports
date_format: "YYYY-MM-DD"

# Timezone for timestamps
timezone: "Asia/Seoul"

# Default CLI (used when no agent-specific mapping exists)
default_cli: gemini

# Per-agent CLI routing
agent_cli_mapping:
  frontend: claude       # Complex UI reasoning, component composition
  backend: gemini        # Fast API scaffolding, CRUD generation
  mobile: gemini         # Fast Flutter code generation
  db: gemini             # Quick schema design
  pm: gemini             # Rapid task decomposition
  qa: claude             # Thorough security and accessibility review
  debug: claude          # Deep root-cause analysis, symbol tracing
  design: claude         # Nuanced design decisions, anti-pattern detection
  tf-infra: gemini       # HCL generation
  dev-workflow: gemini   # Task runner configuration
  translator: claude     # Nuanced translation with cultural sensitivity
  orchestrator: gemini   # Fast coordination
  commit: gemini         # Simple commit message generation
```

### Priorité de résolution du fournisseur

Lorsque `oma agent:spawn` détermine quel CLI utiliser, il suit cette priorité (le plus élevé l'emporte) :

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | `--model` flag | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` in user-preferences.yaml |
| 3 | `default_cli` | `default_cli: gemini` in user-preferences.yaml |
| 4 | `active_vendor` | Legacy `cli-config.yaml` setting |
| 5 (lowest) | Hardcoded fallback | `gemini` |

Cela signifie qu'un flag `--model` l'emporte toujours. Si aucun flag n'est fourni, le système vérifie le mapping spécifique à l'agent, puis la valeur par défaut, puis la configuration héritée, et se rabat enfin sur Gemini.

---

## Méthodes de lancement spécifiques au fournisseur

Le mécanisme de lancement varie selon l'IDE/CLI :

| Vendor | How Agents Are Spawned | Result Handling |
|--------|----------------------|-----------------|
| **Claude Code** | `Agent` tool with `.claude/agents/{name}.md` definitions. Multiple Agent calls in the same message = true parallel. | Synchronous return |
| **Codex CLI** | Model-mediated parallel subagent request | JSON output |
| **Gemini CLI** | `oh-my-ag agent:spawn` CLI command | MCP memory poll |
| **Antigravity IDE** | `oh-my-ag agent:spawn` only (custom subagents not available) | MCP memory poll |
| **CLI Fallback** | `oh-my-ag agent:spawn {agent} {prompt} {session} -w {workspace}` | Result file poll |

Lorsqu'il s'exécute dans Claude Code, le workflow utilise directement l'outil `Agent` :
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Plusieurs appels à l'outil Agent dans le même message s'exécutent en vrai parallèle -- pas d'attente séquentielle.

---

## Surveillance des agents

### Tableau de bord terminal

```bash
oma dashboard
```

Affiche un tableau en direct avec :
- Session ID and overall status
- Per-agent status (running, completed, failed)
- Turn counts
- Latest activity from progress files
- Elapsed time

Le tableau de bord surveille `.serena/memories/` pour les mises à jour en temps réel. Il se rafraîchit à mesure que les agents écrivent leur progression.

### Tableau de bord web

```bash
oma dashboard:web
# Opens http://localhost:9847
```

Fonctionnalités :
- Real-time updates via WebSocket
- Auto-reconnect on connection drops
- Colored agent status indicators
- Activity log streaming from progress and result files
- Session history

### Disposition de terminaux recommandée

Utilisez 3 terminaux pour une visibilité optimale :

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Vérification du statut d'un agent individuel

```bash
oma agent:status <session-id> <agent-id>
```

Retourne le statut actuel d'un agent spécifique : running, completed ou failed, ainsi que le nombre de tours et la dernière activité.

---

## Stratégie d'identifiants de session

Les identifiants de session regroupent les agents travaillant sur la même fonctionnalité. Bonnes pratiques :

- **Une session par fonctionnalité :** Tous les agents travaillant sur « l'authentification utilisateur » partagent `session-auth-01`
- **Format :** Utilisez des identifiants descriptifs : `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Auto-générés :** L'orchestrateur génère les identifiants au format `session-YYYYMMDD-HHMMSS`
- **Réutilisables pour l'itération :** Utilisez le même identifiant de session lors du relancement d'agents avec des améliorations

Les identifiants de session déterminent :
- Quels fichiers de mémoire les agents lisent et écrivent (`progress-{agent}.md`, `result-{agent}.md`)
- Ce que le tableau de bord surveille
- Comment les résultats sont regroupés dans le rapport final

---

## Conseils pour l'exécution parallèle

### À faire

1. **Lock API contracts first.** Run `/plan` before spawning implementation agents so frontend and backend agents agree on endpoints, request/response schemas, and error formats.

2. **Use one session ID per feature.** This keeps agent outputs grouped and dashboard monitoring coherent.

3. **Assign separate workspaces.** Always use `-w` to isolate agents:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitor actively.** Open a dashboard terminal to catch issues early — a failing agent wastes turns if not caught quickly.

5. **Run QA after implementation.** Spawn the QA agent sequentially after all implementation agents complete:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Iterate with re-spawns.** If an agent's output needs refinement, re-spawn it with the original task plus correction context. Do not start a new session.

7. **Start with `/coordinate` if unsure.** The coordinate workflow guides you through the process step by step with user confirmation at each gate.

### À éviter

1. **Do not spawn agents in the same workspace.** Two agents writing to the same directory will create merge conflicts and overwrite each other's work.

2. **Do not exceed MAX_PARALLEL (default 3).** More concurrent agents does not always mean faster results. Each agent needs memory and CPU resources. The default of 3 is tuned for most systems.

3. **Do not skip the plan step.** Spawning agents without a plan leads to misaligned implementations — the frontend builds against one API shape while the backend builds another.

4. **Do not ignore failed agents.** A failed agent's work is incomplete. Check `result-{agent}.md` for the failure reason, fix the prompt, and re-spawn.

5. **Do not mix session IDs for related work.** If backend and frontend agents are working on the same feature, they must share a session ID so the orchestrator can coordinate them.

---

## Exemple de bout en bout

Un workflow d'exécution parallèle complet pour construire une fonctionnalité d'authentification utilisateur :

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/plan.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
