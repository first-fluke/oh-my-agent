---
title: Exécution parallèle
description: Exécuter plusieurs rôles de dispatch OMA en parallèle avec la syntaxe CLI actuelle, les fichiers de tâches, le mode inline, l’isolation des workspaces, la résolution du modèle et du fournisseur, la surveillance, les identifiants de session et les stratégies de récupération.
---

# Exécution parallèle

Le principal avantage d’oh-my-agent est de pouvoir exécuter plusieurs agents spécialisés simultanément. Pendant que l’agent backend implémente une API, l’agent frontend crée l’interface et l’agent mobile construit les écrans de l’application ; l’orchestrateur les coordonne à l’aide d’un état d’exécution et de reçus durables.

---

## agent:spawn : lancer un agent

### Syntaxe de base

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Paramètres

| Paramètre | Requis | Description |
|-----------|--------|-------------|
| `agent-id` | Oui | Rôle de dispatch canonique : `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` ou `explore` |
| `prompt` | Oui | Description de la tâche (chaîne entre guillemets ou chemin vers un fichier de prompt) |
| `session-id` | Oui | Regroupe les agents qui travaillent sur une même fonctionnalité. Format : `session-YYYYMMDD-HHMMSS` ou toute chaîne unique. |
| `options` | Non | Voir la table des options ci-dessous |

### Options

| Option | Court | Description |
|--------|-------|-------------|
| `--workspace <path>` | `-w` | Répertoire de travail de l’agent. L’agent ne modifie que les fichiers de ce répertoire. |
| `--model <vendor>` | `-m` | Remplace le fournisseur CLI pour ce lancement (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` ou `pi`). |
| `--resumed-from <run-id>` | | Lie une reprise au run précédent étayé par des preuves. |
| `--fallback-vendors <vendors>` | | Fournisseurs de repli dans l’ordre lorsque le fournisseur principal ne peut pas s’exécuter. |
| `--task-id <id>` | | Lie le lancement à une tâche du plan de session. |
| `--isolation <mode>` | | `worktree` crée un worktree Git séparé dans le répertoire temporaire des worktrees OMA. Le worktree reste disponible pour revue et fusion/suppression. |
| `--read-only` | | Limite l’agent aux outils non destructifs. |

### Exemples

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

## Lancement parallèle avec des processus en arrière-plan

Pour exécuter plusieurs agents simultanément, utilisez des processus shell en arrière-plan :

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Le `&` lance chaque agent en arrière-plan. `wait` bloque jusqu’à la fin de tous les processus.

### Motif tenant compte des workspaces {#workspace-aware-pattern}

Attribuez toujours des workspaces séparés aux agents parallèles afin d’éviter les conflits de fichiers :

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

## agent:parallel : mode parallèle inline

Pour une syntaxe plus concise qui gère automatiquement les processus en arrière-plan :

### Syntaxe

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Exemples

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

Le flag `--inline` analyse chaque argument `agent:task`. Ajoutez un troisième chemin séparé par deux-points (`agent:task:workspace`) lorsqu’une tâche a besoin d’un workspace précis. Sans `--inline`, transmettez un fichier de tâches YAML au format `{tasks: [{id?, agent, task, workspace?}]}`. `--session` associe les résultats parallèles à une session existante.

---

## Configuration multi-CLI

oh-my-agent route chaque agent vers le CLI approprié via `model_preset` dans `.agents/oma-config.yaml`. Choisissez un preset intégré pour votre fournisseur et, si nécessaire, surchargez individuellement les agents.

### Exemple de configuration

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Presets intégrés : `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` et `mixed`. Voir [Modèles par agent](../guide/per-agent-models.md) pour la configuration.

### Résolution du fournisseur

Lorsque `oma agent spawn` détermine le CLI à utiliser :

| Priorité | Source | Exemple |
|----------|--------|---------|
| 1 (la plus haute) | flag `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | surcharge `agents:` dans `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | valeurs par défaut des agents du `model_preset` actif | recherche du preset pour le rôle |

Le flag `--vendor` est toujours prioritaire. En son absence, le système vérifie les surcharges `agents:`, puis les valeurs du preset, puis le CLI de repli configuré. Avec `model_preset: auto`, les réglages natifs du runtime courant fournissent le modèle.

---

## Méthodes de lancement propres aux fournisseurs

Le mécanisme de lancement dépend de l’IDE ou du CLI :

| Fournisseur | Lancement des agents | Gestion du résultat |
|-------------|----------------------|---------------------|
| **Claude Code** | Les tâches du même fournisseur utilisent l’outil Agent avec `.claude/agents/{name}.md` ; les tâches inter-fournisseurs utilisent `oma agent spawn`. | Retour synchrone |
| **Codex CLI** | Les tâches du même fournisseur utilisent les agents personnalisés natifs de `.codex/agents/{name}.toml` ; les tâches inter-fournisseurs utilisent `oma agent spawn`. | Sortie JSON |
| **Antigravity CLI/IDE** | `oma agent spawn` passe par le runtime `agy` ; les sous-agents natifs personnalisés ne sont pas nécessaires. | Reçu durable et lecture du fichier de résultat |
| **Cursor** | Utilise l’intégration Cursor générée lorsqu’elle existe ; sinon `oma agent spawn`. | Lecture du fichier de résultat |
| **OpenCode / pi** | Utilise le pont d’extension en processus lorsqu’il est sélectionné ; les tâches inter-fournisseurs utilisent `oma agent spawn`. | Lecture du fichier de résultat |
| **CLI Fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Lecture du résultat étayé par des preuves |

Dans Claude Code, le workflow utilise directement l’outil `Agent` :
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Plusieurs appels à l’outil Agent dans un même message s’exécutent réellement en parallèle, sans attente séquentielle.

La même règle de dispatch s’applique à tous les fournisseurs :

1. Résoudre `target_vendor_for_agent` depuis `.agents/oma-config.yaml`
2. S’il correspond au fournisseur du runtime courant, utiliser le fichier d’agent natif de ce fournisseur
3. Sinon, utiliser `oma agent spawn` uniquement pour cet agent

---

## Surveiller les agents

### Tableau de bord du terminal

```bash
oma dashboard terminal
```

Le terminal affiche un tableau en direct avec :
- l’identifiant de session et l’état global ;
- l’état de chaque agent (running, completed, failed) ;
- le nombre de tours ;
- la dernière activité issue des fichiers de progression ;
- le temps écoulé.

Le tableau surveille `.agents/state/memories/` pour afficher la progression en temps réel. Il se rafraîchit lorsque les agents écrivent leur progression.

### Tableau de bord web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Fonctionnalités :
- mises à jour en temps réel via WebSocket ;
- reconnexion automatique après une coupure ;
- indicateurs d’état des agents en couleur ;
- flux du journal d’activité depuis les fichiers de progression et de résultat ;
- historique des sessions.

### Disposition de terminal recommandée

Utilisez 3 terminaux pour une visibilité optimale :

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

### Vérifier l’état d’un agent

```bash
oma agent status <session-id> <agent-id>
```

La commande renvoie l’état actuel de l’agent (running, completed ou failed), le nombre de tours et la dernière activité.

---

## Stratégie des identifiants de session

Les identifiants de session regroupent les agents qui travaillent sur une même fonctionnalité. Bonnes pratiques :

- **Une session par fonctionnalité :** tous les agents qui travaillent sur « user authentication » partagent `session-auth-01`.
- **Format :** utiliser des identifiants descriptifs : `session-auth-01`, `session-payment-v2`, `session-20260324-143000`.
- **Génération automatique :** l’orchestrateur crée des identifiants au format `session-YYYYMMDD-HHMMSS`.
- **Réutilisation pour une itération :** conserver le même identifiant lors du relancement d’agents avec des corrections.

Les identifiants de session déterminent :
- les fichiers mémoire propres au run que les agents lisent et écrivent (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`) ;
- ce que surveille le tableau de bord ;
- la façon dont les résultats sont regroupés dans le rapport final.

---

## Conseils pour l’exécution parallèle

### À faire

1. **Verrouiller d’abord les contrats d’API.** Exécuter `/plan` avant de lancer les agents d’implémentation afin que frontend et backend partagent les endpoints, les schémas request/response et les formats d’erreur.

2. **Utiliser un identifiant de session par fonctionnalité.** Les sorties restent regroupées et le suivi dans le tableau de bord reste cohérent.

3. **Attribuer des workspaces séparés.** Utiliser `-w` pour isoler les agents :
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Surveiller activement.** Ouvrir un terminal de tableau de bord pour détecter tôt les problèmes. Un agent en échec consomme des tours si personne ne le voit.

5. **Lancer la QA après l’implémentation.** Lancer l’agent QA séquentiellement lorsque tous les agents d’implémentation ont terminé :
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Itérer avec des relancements.** Si la sortie d’un agent doit être affinée, le relancer avec la tâche d’origine et le contexte de correction. Ne pas créer une nouvelle session.

7. **Commencer par `/work` en cas de doute.** Le workflow work guide le processus étape par étape, avec confirmation de l’utilisateur à chaque porte.

### À éviter

1. **Ne pas lancer des agents dans le même workspace.** Deux agents qui écrivent dans le même répertoire créent des conflits et peuvent écraser le travail de l’autre.

2. **Ne pas dépasser MAX_PARALLEL (3 par défaut).** Plus d’agents simultanés n’accélère pas toujours le résultat. Chaque agent consomme des ressources mémoire et CPU ; la valeur 3 convient à la plupart des systèmes.

3. **Ne pas sauter l’étape de planification.** Lancer des agents sans plan produit des implémentations désalignées : le frontend et le backend peuvent viser des formes d’API différentes.

4. **Ne pas ignorer un agent en échec.** Consulter sa claim structurée ou son fichier de résultat propre au run, corriger le prompt et relancer.

5. **Ne pas mélanger les identifiants de session d’un même travail.** Les agents backend et frontend qui travaillent sur la même fonctionnalité doivent partager un identifiant pour que l’orchestrateur les coordonne.

---

## Exemple de bout en bout

Voici un workflow parallèle complet pour construire une fonctionnalité d’authentification utilisateur :

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
