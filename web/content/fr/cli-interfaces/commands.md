---
title: Commandes CLI
description: Référence complète de chaque commande CLI oh-my-agent — syntaxe, options, exemples, organisés par catégorie.
---

# Commandes CLI

Après installation globale (`bun install --global oh-my-agent`), utilisez `oma` ou `oh-my-agent`. Pour une utilisation ponctuelle sans installation, exécutez `npx oh-my-agent`.

La variable d'environnement `OH_MY_AG_OUTPUT_FORMAT` peut être définie à `json` pour forcer une sortie lisible par machine sur les commandes qui le supportent. Cela équivaut à passer `--json` à chaque commande.

---

## Configuration et Installation

### oma (install)

La commande par défaut, sans arguments, lance l'installateur interactif.

```
oma
```

**Ce qu'elle fait :**
1. Vérifie la présence d'un ancien répertoire `.agent/` et migre vers `.agents/` si nécessaire.
2. Détecte et propose de supprimer les outils concurrents.
3. Demande le type de projet (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Si backend est sélectionné, demande la variante de langage (Python, Node.js, Rust, Other).
5. Demande la configuration des symlinks GitHub Copilot.
6. Télécharge la dernière archive depuis le registre.
7. Installe les ressources partagées, workflows, configs et compétences sélectionnées.
8. Installe les adaptations pour tous les fournisseurs (Claude, Codex, Gemini, Qwen).
9. Crée les symlinks CLI.
10. Propose d'activer `git rerere`.
11. Propose de configurer MCP pour Antigravity IDE et Gemini CLI.

**Exemple :**
```bash
cd /path/to/my-project
oma
# Suivez les invites interactives
```

### doctor

Vérification de santé des installations CLI, configurations MCP et statut des compétences.

```
oma doctor [--json] [--output <format>]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Ce qu'elle vérifie :**
- Installations CLI : gemini, claude, codex, qwen (version et chemin).
- Statut d'authentification de chaque CLI.
- Configuration MCP : `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Compétences installées : quelles compétences sont présentes et leur statut.

**Exemples :**
```bash
# Sortie texte interactive
oma doctor

# Sortie JSON pour les pipelines CI
oma doctor --json

# Filtrer avec jq pour des vérifications spécifiques
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

Met à jour les compétences vers la dernière version depuis le registre.

```
oma update [-f | --force] [--ci]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `-f, --force` | Écraser les fichiers de configuration personnalisés (`oma-config.yaml`, `mcp.json`, répertoires `stack/`) |
| `--ci` | Mode CI non interactif (pas d'invites, sortie texte brut) |

**Ce qu'elle fait :**
1. Récupère `prompt-manifest.json` depuis le registre pour vérifier la dernière version.
2. Compare avec la version locale dans `.agents/skills/_version.json`.
3. Si déjà à jour, termine.
4. Télécharge et extrait la dernière archive.
5. Préserve les fichiers personnalisés (sauf avec `--force`).
6. Copie les nouveaux fichiers dans `.agents/`.
7. Restaure les fichiers préservés.
8. Met à jour les adaptations fournisseur et rafraîchit les symlinks.

**Exemples :**
```bash
# Mise à jour standard (préserve la config)
oma update

# Mise à jour forcée (réinitialise toute la config par défaut)
oma update --force

# Mode CI (pas d'invites, pas de spinners)
oma update --ci

# Mode CI avec force
oma update --ci --force
```

---

## Surveillance et Métriques

### dashboard

Démarre le tableau de bord terminal pour la surveillance des agents en temps réel.

```
oma dashboard
```

Aucune option. Surveille `.serena/memories/` dans le répertoire courant. Affiche une interface en caractères de dessin avec le statut de session, le tableau des agents et le flux d'activité. Se met à jour à chaque modification de fichier. Appuyez sur `Ctrl+C` pour quitter.

Le répertoire de mémoires peut être redéfini via la variable d'environnement `MEMORIES_DIR`.

**Exemple :**
```bash
# Utilisation standard
oma dashboard

# Répertoire de mémoires personnalisé
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

Démarre le tableau de bord web.

```
oma dashboard:web
```

Lance un serveur HTTP sur `http://localhost:9847` avec une connexion WebSocket pour les mises à jour en direct. Ouvrez l'URL dans un navigateur pour afficher le tableau de bord.

**Variables d'environnement :**

| Variable | Défaut | Description |
|:---------|:-------|:-----------|
| `DASHBOARD_PORT` | `9847` | Port du serveur HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Chemin vers le répertoire de mémoires |

**Exemple :**
```bash
# Utilisation standard
oma dashboard:web

# Port personnalisé
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

Affiche les métriques de productivité.

```
oma stats [--json] [--output <format>] [--reset]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--reset` | Réinitialiser toutes les données de métriques |

**Métriques suivies :**
- Nombre de sessions
- Compétences utilisées (avec fréquence)
- Tâches terminées
- Temps total de session
- Fichiers modifiés, lignes ajoutées, lignes supprimées
- Horodatage de dernière mise à jour

Les métriques sont stockées dans `.serena/metrics.json`. Les données sont collectées depuis les statistiques git et les fichiers de mémoire.

**Exemples :**
```bash
# Voir les métriques actuelles
oma stats

# Sortie JSON
oma stats --json

# Réinitialiser toutes les métriques
oma stats --reset
```

### retro

Rétrospective d'ingénierie avec métriques et tendances.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Arguments :**

| Argument | Description | Défaut |
|:---------|:-----------|:-------|
| `window` | Fenêtre temporelle d'analyse (ex. : `7d`, `2w`, `1m`) | 7 derniers jours |

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--interactive` | Mode interactif avec saisie manuelle |
| `--compare` | Comparer la fenêtre actuelle avec la période précédente de même durée |

**Ce qu'elle affiche :**
- Résumé tweetable (métriques en une ligne)
- Tableau récapitulatif (commits, fichiers modifiés, lignes ajoutées/supprimées, contributeurs)
- Tendances par rapport à la dernière rétro (si un instantané précédent existe)
- Classement des contributeurs
- Distribution temporelle des commits (histogramme horaire)
- Sessions de travail
- Répartition par type de commit (feat, fix, chore, etc.)
- Points chauds (fichiers les plus modifiés)

**Exemples :**
```bash
# 7 derniers jours (par défaut)
oma retro

# 30 derniers jours
oma retro 30d

# 2 dernières semaines
oma retro 2w

# Comparaison avec la période précédente
oma retro 7d --compare

# Mode interactif
oma retro --interactive

# JSON pour l'automatisation
oma retro 7d --json
```

---

## Gestion des Agents

### agent:spawn

Lance un processus de sous-agent.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**Arguments :**

| Argument | Requis | Description |
|:---------|:-------|:-----------|
| `agent-id` | Oui | Type d'agent. L'un de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Oui | Description de la tâche. Peut être du texte en ligne ou un chemin vers un fichier. |
| `session-id` | Oui | Identifiant de session (format : `session-YYYYMMDD-HHMMSS`) |

**Options :**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | Fournisseur CLI à utiliser : `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Répertoire de travail de l'agent. Détecté automatiquement depuis la config monorepo si omis. |

**Ordre de résolution du fournisseur :** flag `--model` > `agent_cli_mapping` dans oma-config.yaml > `default_cli` > `active_vendor` dans cli-config.yaml > `gemini`.

**Résolution du prompt :** Si l'argument prompt est un chemin vers un fichier existant, le contenu du fichier est utilisé comme prompt. Sinon, l'argument est utilisé comme texte en ligne. Les protocoles d'exécution spécifiques au fournisseur sont ajoutés automatiquement.

**Exemples :**
```bash
# Prompt en ligne, détection automatique du workspace
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt depuis un fichier, workspace explicite
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Forcer le fournisseur Claude
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Agent mobile avec workspace détecté automatiquement
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

Vérifie le statut d'un ou plusieurs sous-agents.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**Arguments :**

| Argument | Requis | Description |
|:---------|:-------|:-----------|
| `session-id` | Oui | L'identifiant de session à vérifier |
| `agent-ids` | Non | Liste d'identifiants d'agents séparés par des espaces. Si omis, aucune sortie. |

**Options :**

| Flag | Description | Défaut |
|:-----|:-----------|:-------|
| `-r, --root <path>` | Chemin racine pour les vérifications de mémoire | Répertoire courant |

**Valeurs de statut :**
- `completed` -- Le fichier de résultat existe (avec un en-tête de statut optionnel).
- `running` -- Le fichier PID existe et le processus est actif.
- `crashed` -- Le fichier PID existe mais le processus est mort, ou aucun fichier PID/résultat trouvé.

**Format de sortie :** Une ligne par agent : `{agent-id}:{status}`

**Exemples :**
```bash
# Vérifier des agents spécifiques
oma agent:status session-20260324-143000 backend frontend

# Sortie :
# backend:running
# frontend:completed

# Vérifier avec un chemin racine personnalisé
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

Exécute plusieurs sous-agents en parallèle.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Arguments :**

| Argument | Requis | Description |
|:---------|:-------|:-----------|
| `tasks` | Oui | Soit un chemin vers un fichier de tâches YAML, soit (avec `--inline`) des spécifications de tâches en ligne |

**Options :**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | Fournisseur CLI à utiliser pour tous les agents |
| `-i, --inline` | Mode en ligne : spécifier les tâches au format `agent:task[:workspace]` |
| `--no-wait` | Mode arrière-plan -- lance les agents et retourne immédiatement |

**Format du fichier de tâches YAML :**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # optionnel, détecté automatiquement si omis
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**Format de tâche en ligne :** `agent:task` ou `agent:task:workspace` (le workspace doit commencer par `./` ou `/`).

**Répertoire de résultats :** `.agents/results/parallel-{timestamp}/` contient les fichiers de logs de chaque agent.

**Exemples :**
```bash
# Depuis un fichier YAML
oma agent:parallel tasks.yaml

# Mode en ligne
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Mode arrière-plan (sans attente)
oma agent:parallel tasks.yaml --no-wait

# Forcer le fournisseur pour tous les agents
oma agent:parallel tasks.yaml -m claude
```

### agent:review

Exécute une revue de code en utilisant un CLI IA externe (codex, claude, gemini ou qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | Fournisseur CLI à utiliser : `codex`, `claude`, `gemini`, `qwen`. Par défaut, le fournisseur résolu depuis la config. |
| `-p, --prompt <prompt>` | Prompt de revue personnalisé. Si omis, un prompt de revue de code par défaut est utilisé. |
| `-w, --workspace <path>` | Chemin à examiner. Par défaut, le répertoire de travail courant. |
| `--no-uncommitted` | Ignorer les modifications non commitées. Si activé, seules les modifications commitées dans la session sont examinées. |

**Ce qu'elle fait :**
- Détecte automatiquement l'identifiant de session courant depuis l'environnement ou l'activité git récente.
- Pour `codex` : utilise la sous-commande native `codex review`.
- Pour `claude`, `gemini`, `qwen` : construit une requête de revue basée sur un prompt et invoque le CLI avec le prompt de revue.
- Par défaut, examine les modifications non commitées dans le répertoire de travail.
- Avec `--no-uncommitted`, restreint la revue aux modifications commitées dans la session courante.

**Exemples :**
```bash
# Examiner les modifications non commitées avec le fournisseur par défaut
oma agent:review

# Examiner avec codex (utilise la commande native codex review)
oma agent:review -m codex

# Examiner avec claude en utilisant un prompt personnalisé
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# Examiner un chemin spécifique
oma agent:review -w ./apps/api

# Examiner uniquement les modifications commitées (ignorer l'arbre de travail)
oma agent:review --no-uncommitted

# Examiner les modifications commitées dans un workspace spécifique avec gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Gestion de la Mémoire

### memory:init

Initialise le schéma de mémoire Serena.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--force` | Écraser les fichiers de schéma vides ou existants |

**Ce qu'elle fait :** Crée la structure de répertoire `.serena/memories/` avec les fichiers de schéma initiaux que les outils MCP de mémoire utilisent pour lire et écrire l'état des agents.

**Exemples :**
```bash
# Initialiser la mémoire
oma memory:init

# Forcer l'écrasement du schéma existant
oma memory:init --force
```

---

## Intégration et Utilitaires

### auth:status

Vérifie le statut d'authentification de tous les CLI supportés.

```
oma auth:status [--json] [--output <format>]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Vérifie :** Gemini (clé API), Claude (clé API ou OAuth), Codex (clé API), Qwen (clé API).

**Exemples :**
```bash
oma auth:status
oma auth:status --json
```

### usage:anti

Affiche les quotas d'utilisation des modèles depuis l'IDE Antigravity local.

```
oma usage:anti [--json] [--output <format>] [--raw]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--raw` | Afficher la réponse RPC brute d'Antigravity |

**Ce qu'elle fait :** Se connecte à l'instance locale de l'IDE Antigravity et interroge les quotas d'utilisation des modèles.

**Exemples :**
```bash
oma usage:anti
oma usage:anti --raw
oma usage:anti --json
```

### bridge

Passerelle MCP stdio vers le transport Streamable HTTP.

```
oma bridge [url]
```

**Arguments :**

| Argument | Requis | Description |
|:---------|:-------|:-----------|
| `url` | Non | L'URL du point de terminaison Streamable HTTP (ex. : `http://localhost:12341/mcp`) |

**Ce qu'elle fait :** Fait office de passerelle de protocole entre le transport MCP stdio (utilisé par l'IDE Antigravity) et le transport Streamable HTTP (utilisé par le serveur MCP Serena). Cela est nécessaire car l'IDE Antigravity ne supporte pas directement les transports HTTP/SSE.

**Architecture :**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**Exemple :**
```bash
# Passerelle vers le serveur Serena local
oma bridge http://localhost:12341/mcp
```

### verify

Vérifie la sortie d'un sous-agent par rapport aux critères attendus.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**Arguments :**

| Argument | Requis | Description |
|:---------|:-------|:-----------|
| `agent-type` | Oui | L'un de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Options :**

| Flag | Description | Défaut |
|:-----|:-----------|:-------|
| `-w, --workspace <path>` | Chemin du workspace à vérifier | Répertoire courant |
| `--json` | Sortie au format JSON | |
| `--output <format>` | Format de sortie (`text` ou `json`) | |

**Ce qu'elle fait :** Exécute le script de vérification pour le type d'agent spécifié, en vérifiant le succès du build, les résultats des tests et la conformité du périmètre.

**Exemples :**
```bash
# Vérifier la sortie backend dans le workspace par défaut
oma verify backend

# Vérifier le frontend dans un workspace spécifique
oma verify frontend -w ./apps/web

# Sortie JSON pour la CI
oma verify backend --json
```

### cleanup

Nettoie les processus de sous-agents orphelins et les fichiers temporaires.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--dry-run` | Afficher ce qui serait nettoyé sans effectuer de modifications |
| `-y, --yes` | Ignorer les invites de confirmation et tout nettoyer |
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Ce qu'elle nettoie :**
- Fichiers PID orphelins dans le répertoire temporaire système (`/tmp/subagent-*.pid`).
- Fichiers de logs orphelins (`/tmp/subagent-*.log`).
- Répertoires Gemini Antigravity (brain, implicit, knowledge) sous `.gemini/antigravity/`.

**Exemples :**
```bash
# Aperçu de ce qui serait nettoyé
oma cleanup --dry-run

# Nettoyage avec invites de confirmation
oma cleanup

# Tout nettoyer sans invites
oma cleanup --yes

# Sortie JSON pour l'automatisation
oma cleanup --json
```

### visualize

Visualise la structure du projet sous forme de graphe de dépendances.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` est un alias intégré pour `visualize`.

**Options :**

| Flag | Description |
|:-----|:-----------|
| `--json` | Sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Ce qu'elle fait :** Analyse la structure du projet et génère un graphe de dépendances montrant les relations entre compétences, agents, workflows et ressources partagées.

**Exemples :**
```bash
oma visualize
oma viz --json
```

### star

Ajouter une étoile à oh-my-agent sur GitHub.

```
oma star
```

Aucune option. Nécessite que le CLI `gh` soit installé et authentifié. Ajoute une étoile au dépôt `first-fluke/oh-my-agent`.

**Exemple :**
```bash
oma star
```

### describe

Décrit les commandes CLI au format JSON pour l'introspection à l'exécution.

```
oma describe [command-path]
```

**Arguments :**

| Argument | Requis | Description |
|:---------|:-------|:-----------|
| `command-path` | Non | La commande à décrire. Si omis, décrit le programme racine. |

**Ce qu'elle fait :** Produit un objet JSON avec le nom, la description, les arguments, les options et les sous-commandes de la commande. Utilisé par les agents IA pour comprendre les capacités CLI disponibles.

**Exemples :**
```bash
# Décrire toutes les commandes
oma describe

# Décrire une commande spécifique
oma describe agent:spawn

# Décrire une sous-commande
oma describe "agent:parallel"
```

### help

Affiche les informations d'aide.

```
oma help
```

Affiche le texte d'aide complet avec toutes les commandes disponibles.

### version

Affiche le numéro de version.

```
oma version
```

Affiche la version actuelle du CLI et termine.

---

## Variables d'Environnement

| Variable | Description | Utilisé par |
|:---------|:-----------|:------------|
| `OH_MY_AG_OUTPUT_FORMAT` | Définir à `json` pour forcer la sortie JSON sur toutes les commandes qui le supportent | Toutes les commandes avec le flag `--json` |
| `DASHBOARD_PORT` | Port du tableau de bord web | `dashboard:web` |
| `MEMORIES_DIR` | Redéfinir le chemin du répertoire de mémoires | `dashboard`, `dashboard:web` |

---

## Alias

| Alias | Commande complète |
|:------|:-----------------|
| `viz` | `visualize` |
