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

| Paramètre | Requis | Description |
|-----------|----------|-------------|
| `agent-id` | Oui | Identifiant de l'agent : `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Oui | Description de la tâche (chaîne entre guillemets ou chemin vers un fichier de prompt) |
| `session-id` | Oui | Regroupe les agents travaillant sur la même fonctionnalité. Format : `session-YYYYMMDD-HHMMSS` ou toute chaîne unique. |
| `options` | Non | Voir le tableau des options ci-dessous |

### Options

| Option | Court | Description |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Répertoire de travail de l'agent. L'agent ne modifie que les fichiers à l'intérieur de ce répertoire. |
| `--model <name>` | `-m` | Remplace le fournisseur CLI pour ce lancement spécifique. Options : `antigravity`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Remplace la limite de tours par défaut pour cet agent. |
| `--json` | | Sortie au format JSON (utile pour le scripting). |
| `--no-wait` | | Mode fire-and-forget, retourne immédiatement sans attendre la fin. |

### Exemples

```bash
# Lancement d'un agent backend avec le fournisseur par défaut
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Lancement avec isolation de workspace
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Remplacement du fournisseur pour cet agent spécifique
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Limite de tours plus élevée pour une tâche complexe
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Utiliser un fichier de prompt plutôt que du texte en ligne
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Lancement parallèle avec des processus en arrière-plan

Pour exécuter plusieurs agents simultanément, utilisez des processus shell en arrière-plan :

```bash
# Lancement de 3 agents en parallèle
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Bloque jusqu'à la fin de tous les agents
```

Le `&` exécute chaque agent en arrière-plan. `wait` bloque jusqu'à ce que tous les processus en arrière-plan soient terminés.

### Pattern avec gestion des workspaces

Assignez toujours des workspaces séparés lorsque vous exécutez des agents en parallèle pour éviter les conflits de fichiers :

```bash
# Exécution parallèle full-stack
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Après l'implémentation, exécuter la QA (séquentiel, dépend de l'implémentation)
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
# Exécution parallèle de base
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Avec no-wait (fire and forget)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Tous les agents partagent automatiquement la même session
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
# .agents/oma-config.yaml

# Langue de réponse
language: en

# Format de date pour les rapports
date_format: "YYYY-MM-DD"

# Fuseau horaire pour les horodatages
timezone: "Asia/Seoul"

# CLI par défaut (utilisé lorsqu'aucun mapping spécifique à l'agent n'existe)
default_cli: gemini

# Routage CLI par agent
model_preset (per-agent overrides via `agents:`):
  frontend: claude       # Raisonnement UI complexe, composition de composants
  backend: gemini        # Échafaudage rapide d'API, génération CRUD
  mobile: gemini         # Génération rapide de code Flutter
  db: gemini             # Conception de schéma rapide
  pm: gemini             # Décomposition rapide des tâches
  qa: claude             # Revue de sécurité et d'accessibilité approfondie
  debug: claude          # Analyse de cause profonde, traçage de symboles
  design: claude         # Décisions de design nuancées, détection d'anti-patterns
  tf-infra: gemini       # Génération HCL
  dev-workflow: gemini   # Configuration du task runner
  translator: claude     # Traduction nuancée avec sensibilité culturelle
  orchestrator: gemini   # Coordination rapide
  commit: gemini         # Génération simple de messages de commit
```

### Priorité de résolution du fournisseur

Lorsque `oma agent:spawn` détermine quel CLI utiliser, il suit cette priorité (le plus élevé l'emporte) :

| Priorité | Source | Exemple |
|----------|--------|---------|
| 1 (la plus haute) | Flag `--model` | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `model_preset (per-agent overrides via `agents:`)` | `model_preset (per-agent overrides via `agents:`).backend: gemini` dans oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` dans oma-config.yaml |
| 4 | `active_vendor` | Paramètre hérité de `cli-config.yaml` |
| 5 (la plus basse) | Repli codé en dur | `gemini` |

Cela signifie qu'un flag `--model` l'emporte toujours. Si aucun flag n'est fourni, le système vérifie le mapping spécifique à l'agent, puis la valeur par défaut, puis la configuration héritée, et se rabat enfin sur Gemini.

---

## Méthodes de lancement spécifiques au fournisseur

Le mécanisme de lancement varie selon l'IDE/CLI :

| Fournisseur | Comment les agents sont lancés | Traitement du résultat |
|--------|----------------------|-----------------|
| **Claude Code** | Outil `Agent` avec définitions `.claude/agents/{name}.md`. Plusieurs appels Agent dans le même message produisent un vrai parallélisme. | Retour synchrone |
| **Codex CLI** | Requête parallèle de sous-agents arbitrée par le modèle | Sortie JSON |
| **Gemini CLI** | Commande CLI `oma agent:spawn` | Polling de la mémoire MCP |
| **Antigravity IDE** | `oma agent:spawn` uniquement (sous-agents personnalisés indisponibles) | Polling de la mémoire MCP |
| **Repli CLI** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Polling du fichier de résultat |

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
- Identifiant de session et statut global
- Statut par agent (running, completed, failed)
- Nombre de tours
- Dernière activité depuis les fichiers de progression
- Temps écoulé

Le tableau de bord surveille `.serena/memories/` pour les mises à jour en temps réel. Il se rafraîchit à mesure que les agents écrivent leur progression.

### Tableau de bord web

```bash
oma dashboard:web
# Ouvre http://localhost:9847
```

Fonctionnalités :
- Mises à jour en temps réel via WebSocket
- Reconnexion automatique en cas de coupure
- Indicateurs colorés du statut des agents
- Flux des logs d'activité depuis les fichiers de progression et de résultats
- Historique des sessions

### Disposition de terminaux recommandée

Utilisez 3 terminaux pour une visibilité optimale :

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1 :          │   Terminal 2 :       │
│   oma dashboard         │   Commandes de       │
│   (suivi en direct)     │   lancement d'agents │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3 :                                 │
│   Logs de test/build, opérations git           │
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

1. **Verrouillez les contrats d'API en premier.** Exécutez `/plan` avant de lancer les agents d'implémentation, afin que les agents frontend et backend s'accordent sur les endpoints, les schémas de requête/réponse et les formats d'erreur.

2. **Utilisez un seul identifiant de session par fonctionnalité.** Cela garde les sorties d'agents regroupées et le suivi du tableau de bord cohérent.

3. **Assignez des workspaces séparés.** Utilisez toujours `-w` pour isoler les agents :
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Surveillez activement.** Ouvrez un terminal de tableau de bord pour détecter tôt les problèmes : un agent en échec gaspille des tours s'il n'est pas repéré rapidement.

5. **Exécutez la QA après l'implémentation.** Lancez l'agent QA séquentiellement, une fois tous les agents d'implémentation terminés :
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Itérez via des relancements.** Si la sortie d'un agent doit être affinée, relancez-le avec la tâche d'origine et le contexte de correction. Ne démarrez pas une nouvelle session.

7. **Commencez par `/work` en cas de doute.** Le workflow work vous guide pas à pas, avec confirmation utilisateur à chaque porte.

### À éviter

1. **Ne lancez pas plusieurs agents dans le même workspace.** Deux agents écrivant dans le même répertoire créeront des conflits de fusion et écraseront le travail de l'un et l'autre.

2. **Ne dépassez pas MAX_PARALLEL (3 par défaut).** Plus d'agents simultanés ne donne pas toujours des résultats plus rapides. Chaque agent consomme de la mémoire et du CPU. La valeur par défaut de 3 est calibrée pour la plupart des systèmes.

3. **Ne sautez pas l'étape de planification.** Lancer des agents sans plan mène à des implémentations désalignées : le frontend s'appuie sur une forme d'API tandis que le backend en construit une autre.

4. **Ne négligez pas les agents en échec.** Le travail d'un agent en échec est incomplet. Consultez `result-{agent}.md` pour la raison de l'échec, corrigez le prompt et relancez.

5. **Ne mélangez pas les identifiants de session pour un travail apparenté.** Si des agents backend et frontend travaillent sur la même fonctionnalité, ils doivent partager un identifiant de session pour que l'orchestrateur puisse les coordonner.

---

## Exemple de bout en bout

Un workflow d'exécution parallèle complet pour construire une fonctionnalité d'authentification utilisateur :

```bash
# Étape 1 : planifier la fonctionnalité
# (Dans votre IDE IA, exécutez /plan ou décrivez la fonctionnalité)
# Cela crée .agents/results/plan-{sessionId}.json avec le découpage des tâches

# Étape 2 : lancer les agents d'implémentation en parallèle
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Étape 3 : surveillance dans un terminal distinct
# Terminal 2 :
oma dashboard

# Étape 4 : attendre tous les agents d'implémentation
wait

# Étape 5 : exécuter la revue QA
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Étape 6 : si la QA trouve des problèmes, relancer les agents concernés avec les correctifs
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Étape 7 : relancer la QA pour vérifier les correctifs
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
