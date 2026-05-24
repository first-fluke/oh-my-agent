---
title: Options CLI
description: Référence exhaustive de toutes les options CLI — flags globaux, contrôle de sortie, options par commande et patterns d'utilisation réels.
---

# Options CLI

## Options globales

Ces options sont disponibles sur la commande racine `oma` / `oh-my-agent` :

| Option | Description |
|:-----|:-----------|
| `-V, --version` | Affiche le numéro de version et quitte |
| `-h, --help` | Affiche l'aide de la commande |

Toutes les sous-commandes supportent également `-h, --help` pour afficher leur aide spécifique.

---

## Options de sortie

De nombreuses commandes supportent une sortie lisible par machine pour les pipelines CI/CD et l'automatisation. Il existe trois manières de demander une sortie JSON, par ordre de priorité :

### 1. --json Flag

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

Le flag `--json` est la manière la plus simple d'obtenir une sortie JSON. Disponible sur : `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. --output Flag

```bash
oma stats --output json
oma doctor --output text
```

Le flag `--output` accepte `text` ou `json`. Il offre la même fonctionnalité que `--json` mais vous permet aussi de demander explicitement une sortie texte (utile lorsque la variable d'environnement est définie à json mais que vous souhaitez du texte pour une commande spécifique).

**Validation :** Si un format invalide est fourni, le CLI lève : `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_OUTPUT_FORMAT Environment Variable

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # produit du JSON
oma doctor   # produit du JSON
oma retro    # produit du JSON
```

Définissez cette variable d'environnement à `json` pour forcer la sortie JSON sur toutes les commandes qui le supportent. Seul `json` est reconnu ; toute autre valeur est ignorée et le défaut est texte.

**Ordre de résolution :** flag `--json` > flag `--output` > variable d'environnement `OH_MY_AG_OUTPUT_FORMAT` > `text` (par défaut).

### Commandes supportant la sortie JSON

| Commande | `--json` | `--output` | Notes |
|:---------|:---------|:----------|:------|
| `doctor` | Oui | Oui | Inclut les vérifications CLI, le statut MCP et le statut des compétences |
| `stats` | Oui | Oui | Objet complet de métriques |
| `retro` | Oui | Oui | Instantané avec métriques, auteurs, types de commit |
| `cleanup` | Oui | Oui | Liste des éléments nettoyés |
| `auth:status` | Oui | Oui | Statut d'authentification par CLI |
| `memory:init` | Oui | Oui | Résultat de l'initialisation |
| `verify` | Oui | Oui | Résultats de vérification par contrôle |
| `visualize` | Oui | Oui | Graphe de dépendances au format JSON |
| `describe` | Toujours JSON | N/A | Émet toujours du JSON (commande d'introspection) |
| `recap` | Oui | Oui | Historique de conversation par outil/session |
| `export` | Oui | Oui | Statut d'export et chemins cibles |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/A | Utilisez `--format json` à la place de `--json` |
| `search ...` | Toujours JSON | N/A | Toutes les sous-commandes `search` émettent du JSON ; utilisez `--pretty` pour la lecture humaine |

---

## Options par commande

### oma (install)

```
oma
```

Aucun flag. L'installateur interactif demande la sélection d'un preset et écrit `model_preset` dans `.agents/oma-config.yaml`.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Option | Description | Par défaut |
|:-----|:------------|:--------|
| `--json` | Émet du JSON au lieu d'un texte formaté. | `false` |
| `--output <format>` | Format de sortie explicite (`text` ou `json`). Voir [Options de sortie](#options-de-sortie). | `text` |
| `--profile` | Affiche la matrice de santé des profils — slug de modèle résolu, CLI et statut d'authentification par agent à partir du `model_preset` actif et des surcharges `agents:`. Voir [Per-Agent Models](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Écrase les fichiers de configuration personnalisés lors de la mise à jour. Affecte : `oma-config.yaml`, `mcp.json`, répertoires `stack/`. Sans ce flag, ces fichiers sont sauvegardés avant la mise à jour puis restaurés. | `false` |
| `--ci` | | Exécute en mode CI non interactif. Saute toutes les invites de confirmation, utilise une sortie console brute plutôt que des spinners et animations. Requis pour les pipelines CI/CD où stdin est indisponible. | `false` |

**Comportement avec --force :**
- `oma-config.yaml` est remplacé par la valeur par défaut du registre.
- `mcp.json` est remplacé par la valeur par défaut du registre.
- Le répertoire backend `stack/` (ressources spécifiques au langage) est remplacé.
- Tous les autres fichiers sont toujours mis à jour, indépendamment de ce flag.

**Comportement avec --ci :**
- Pas de `console.clear()` au démarrage.
- `@clack/prompts` est remplacé par un simple `console.log`.
- Les invites de détection de concurrents sont ignorées.
- Les erreurs lèvent une exception au lieu d'appeler `process.exit(1)`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Option | Description | Par défaut |
|:-----|:-----------|:--------|
| `--reset` | Réinitialise toutes les données de métriques. Supprime `.serena/metrics.json` et le recrée avec des valeurs vides. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Option | Description | Par défaut |
|:-----|:-----------|:--------|
| `--interactive` | Mode interactif avec saisie manuelle. Invite à fournir un contexte supplémentaire que git ne peut pas collecter (par exemple humeur, événements notables). | `false` |
| `--compare` | Compare la fenêtre temporelle courante à la précédente de même durée. Affiche les deltas de métriques (par exemple commits +12, lignes ajoutées -340). | `false` |

**Format de l'argument window :**
- `7d` — 7 jours
- `2w` — 2 semaines
- `1m` — 1 mois
- Omettre pour la valeur par défaut (7 jours)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Mode aperçu. Liste tous les éléments qui seraient nettoyés sans effectuer de modifications. Code de sortie 0 quels que soient les résultats. | `false` |
| `--yes` | `-y` | Saute toutes les invites de confirmation. Nettoie tout sans demander. Utile dans les scripts et la CI. | `false` |

**Ce qui est nettoyé :**
1. Fichiers PID orphelins : `/tmp/subagent-*.pid` dont le processus référencé n'est plus actif.
2. Fichiers de logs orphelins : `/tmp/subagent-*.log` correspondant à des PID morts.
3. Répertoires Gemini Antigravity : `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` ; ils accumulent de l'état au fil du temps et peuvent grossir.

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | Remplacement du fournisseur CLI. Doit être l'un de : `antigravity`, `claude`, `codex`, `qwen`. Prioritaire sur toute la résolution de fournisseur basée sur la configuration. | Résolu depuis la config |
| `--workspace` | `-w` | Répertoire de travail de l'agent. Si omis ou défini à `.`, le CLI détecte automatiquement le workspace à partir des fichiers de configuration monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-détecté ou `.` |

**Validation :**
- `agent-id` doit être l'un de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` ne doit pas contenir `..`, `?`, `#`, `%`, ni de caractères de contrôle.
- `vendor` doit être l'un de : `antigravity`, `claude`, `codex`, `qwen`.

**Comportement spécifique au fournisseur :**

| Fournisseur | Commande | Flag d'auto-approbation | Flag de prompt |
|:------------|:---------|:------------------------|:---------------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (aucun) | `-p` |
| codex | `codex` | `--full-auto` | (aucun, le prompt est positionnel) |
| qwen | `qwen` | `--yolo` | `-p` |

Ces valeurs par défaut peuvent être surchargées dans `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Chemin racine pour localiser les fichiers mémoire (`.serena/memories/result-{agent}.md`) et les fichiers PID. | Répertoire de travail courant |

**Logique de détermination du statut :**
1. Si `.serena/memories/result-{agent}.md` existe : lit l'en-tête `## Status:`. En l'absence d'en-tête, rapporte `completed`.
2. Si un fichier PID existe à `/tmp/subagent-{session-id}-{agent}.pid` : vérifie si le PID est actif. Rapporte `running` s'il est actif, `crashed` sinon.
3. Si aucun des deux fichiers n'existe : rapporte `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | Remplacement du fournisseur CLI appliqué à tous les agents lancés. | Résolu par agent depuis la config |
| `--inline` | `-i` | Interprète les arguments de tâche comme des chaînes `agent:task[:workspace]` plutôt qu'un chemin de fichier. | `false` |
| `--no-wait` | | Mode arrière-plan. Démarre tous les agents et retourne immédiatement sans attendre la fin. La liste des PID et les logs sont enregistrés dans `.agents/results/parallel-{timestamp}/`. | `false` (attend la fin) |

**Format de tâche inline :** `agent:task` ou `agent:task:workspace`
- Le workspace est détecté en vérifiant si le dernier segment séparé par `:` commence par `./`, `/`, ou vaut `.`.
- Exemple : `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Exemple : `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-détecté.

**Format de fichier de tâches YAML :**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # optionnel
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Option | Description | Par défaut |
|:-----|:------------|:--------|
| `--window <period>` | Fenêtre temporelle : `1d`, `3d`, `7d`, `2w`, `30d`. Ignoré lorsque `--date` est défini. | `1d` |
| `--date <date>` | Date spécifique (`YYYY-MM-DD`). Prioritaire sur `--window`. | |
| `--tool <tools>` | Filtre les sessions par outil. Liste séparée par des virgules : `claude`, `codex`, `qwen`, `cursor`. | tous les outils |
| `--top <n>` | N'affiche que les N premiers projets/sujets dans le résumé. | illimité |
| `--sort <metric>` | Trie les sessions par `count` ou `duration`. | `count` |
| `--mermaid` | Émet un diagramme de Gantt Mermaid au lieu du résumé par défaut. | `false` |
| `--graph` | Ouvre un graphe interactif dans le navigateur. Mutuellement exclusif avec `--mermaid`. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:------------|:--------|
| `--dir <path>` | `-d` | Répertoire cible où écrire les règles exportées. | `process.cwd()` |

**Formats pris en charge :** `cursor` (écrit les fichiers `.cursor/rules` dérivés des compétences installées).

### search

```
oma search <subcommand> [...]
```

Le groupe `search` gère sa propre sortie JSON (pas de flags `--json` / `--output`). Utilisez `--pretty` sur les sous-commandes URL/requête pour formater la sortie, et appuyez-vous sur les options spécifiques ci-dessous :

| Sous-commande | Options notables |
|:--------------|:-----------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (défaut `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (défaut `en`), `--format <spec>`, `--timeout` (défaut `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (défaut `github`), `--language`, `--repo`, `--limit` (défaut `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | aucun — exécute des vérifications binaires pour Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` |

**Codes de sortie :** `0` ok, `1` erreur, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Utilisez-les dans les scripts pour distinguer les blocages transitoires des entrées invalides.

### image

```
oma image <subcommand> [...]
```

Le format de sortie est contrôlé par sous-commande via `--format <text|json>` (et non le flag partagé `--json`).

`image generate` accepte :

| Option | Court | Description | Par défaut |
|:-----|:------|:------------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto` se résout à partir de `image-config.yaml` et de l'authentification disponible. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | défaut du fournisseur |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | défaut du fournisseur |
| `--count <n>` | `-n` | Nombre d'images, 1..5. | `1` |
| `--out <dir>` | | Répertoire de sortie. Doit être à l'intérieur de `$PWD` sauf si `--allow-external-out` est défini. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | Autorise les chemins `--out` hors de `$PWD`. | `false` |
| `--model <name>` | | Surcharge de modèle spécifique au fournisseur (par exemple `gpt-image-2`, `flux`, `imagen-4`). | défaut du fournisseur |
| `--strategy <list>` | | Ordre de fallback Gemini, séparé par des virgules parmi `mcp`, `stream`, `api`. | défaut du fournisseur |
| `--timeout <seconds>` | | Timeout par image. | défaut du fournisseur |
| `--reference <path>` | `-r` | Image de référence pour le transfert de style/sujet. Répétable (`-r a.png -r b.png`) ou séparée par virgules. Validée en taille (≤ 5 Mo), format (PNG/JPEG/GIF/WebP via magic bytes) et nombre (≤ 10). Pris en charge sur `codex` (passe `-i` à `codex exec`) et `gemini` (inline base64 `inlineData`). Rejeté avec exit 4 sur `pollinations`. | |
| `--yes` | `-y` | Saute la confirmation de coût. | `false` |
| `--no-prompt-in-manifest` | | Stocke le SHA256 du prompt au lieu du texte brut dans `manifest.json`. | `false` |
| `--dry-run` | | Affiche le plan et l'estimation de coût ; n'exécute pas. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor` et `image list-vendors` n'acceptent que `--format <text|json>`.

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Option | Description | Par défaut |
|:-----|:-----------|:--------|
| `--force` | Écrase les fichiers de schéma vides ou existants dans `.serena/memories/`. Sans ce flag, les fichiers existants ne sont pas modifiés. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Option | Court | Description | Par défaut |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Chemin du répertoire workspace à vérifier. | Répertoire de travail courant |

**Types d'agents :** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Exemples pratiques

### Pipeline CI : mise à jour et vérification

```bash
# Mise à jour en mode CI, puis exécution de doctor pour vérifier l'installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Collecte automatisée de métriques

```bash
# Collecte des métriques en JSON et envoi vers un système de monitoring
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Exécution batch d'agents avec surveillance de statut

```bash
# Démarre les agents en arrière-plan
oma agent:parallel tasks.yaml --no-wait

# Vérifie le statut périodiquement
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Nettoyage en CI après les tests

```bash
# Nettoie tous les processus orphelins sans invite
oma cleanup --yes --json
```

### Vérification consciente du workspace

```bash
# Vérifie chaque domaine dans son workspace
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro avec comparaison pour les revues de sprint

```bash
# Retro de deux semaines avec comparaison au sprint précédent
oma retro 2w --compare

# Enregistre au format JSON pour le rapport de sprint
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script complet de vérification de santé

```bash
#!/bin/bash
set -e

echo "=== Vérification de santé oh-my-agent ==="

# Vérifie les installations CLI
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MANQUANT" end)"'

# Vérifie le statut d'authentification
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Vérifie les métriques
oma stats --json | jq -r '"Sessions : \(.sessions), Tâches : \(.tasksCompleted)"'

echo "=== Terminé ==="
```

### Describe pour l'introspection d'agents

```bash
# Un agent IA peut découvrir les commandes disponibles
oma describe | jq '.command.subcommands[] | {name, description}'

# Obtenir les détails d'une commande spécifique
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
