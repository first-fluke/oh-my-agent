---
title: "Options CLI"
description: "Référence exhaustive de toutes les options CLI, avec indicateurs globaux, contrôle de sortie, options par commande et exemples concrets."
---

# Options CLI

## Options globales

Ces options sont disponibles sur la commande racine `oma` / `oh-my-agent` :

| Option | Description |
|:-----|:-----------|
| `-g, --global` | Agit sur l’installation HOME (`~/.agents/`) au lieu de `<cwd>/.agents/` |
| `-y, --yes` | Ignore les invites lorsque la commande sélectionnée prend en charge la confirmation ; les contrôles de sécurité propres à la commande restent appliqués |
| `-V, --version` | Affiche le numéro de version puis quitte |
| `-h, --help` | Affiche l’aide de la commande |

Toutes les sous-commandes prennent aussi en charge `-h, --help` pour afficher leur aide spécifique.

`--global` définit la racine d’installation pour tout le processus : `install`, `update`, `link` et `uninstall` résolvent donc tous vers `~/.agents/`, quel que soit le répertoire depuis lequel vous les lancez. `OMA_HOME=<abs-path>` la remplace — voir [Installation globale](../guide/global-install.md).

---

## Options de sortie {#output-options}

De nombreuses commandes prennent en charge une sortie lisible par machine pour les pipelines CI/CD et l’automatisation. Il existe trois manières de demander une sortie JSON, dans l’ordre de priorité suivant :

### 1. Indicateur --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

L’indicateur `--json` est disponible uniquement sur les chemins individuels qui l’annoncent. Ne déduisez pas sa prise en charge à partir d’une famille de commandes : par exemple, les feuilles `image`, `video` et `slide` exposent `--output` lorsque le registre le liste, tandis que `search` possède son propre flux JSON. La matrice du registre à la fin de cette page est la liste de référence pour chaque chemin.

### 2. Indicateur --output

```bash
oma stats get --output json
oma doctor --output text
```

L’indicateur `--output` accepte `text` ou `json`. Il offre la même fonction que `--json` tout en permettant de demander explicitement une sortie texte (utile lorsque la variable d’environnement vaut json mais qu’une commande précise doit produire du texte).

**Validation :** si un format invalide est fourni, le CLI lève : `Invalid output format: {value}. Expected one of text, json`.

### 3. Variable d’environnement OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Définissez cette variable d’environnement à `json` pour forcer une sortie JSON sur toutes les commandes qui la prennent en charge. Seule la valeur `json` est reconnue ; toute autre valeur est ignorée et la sortie texte est utilisée.

**Ordre de résolution :** indicateur `--json` > indicateur `--output` > variable d’environnement `OH_MY_AG_OUTPUT_FORMAT` > `text` (valeur par défaut).

### Commandes prenant en charge la sortie JSON

| Commande | `--json` | `--output` | Notes |
|:--------|:---------|:----------|:------|
| `doctor` | Oui | Oui | Inclut les contrôles CLI, l’état MCP et l’état des compétences |
| `stats` | Oui | Oui | Objet complet des métriques |
| `retro` | Oui | Oui | Instantané avec métriques, auteurs et types de commits |
| `cleanup` | Oui | Oui | Liste des éléments nettoyés |
| `auth status` | Oui | Oui | État d’authentification par CLI |
| `memory init` | Oui | Oui | Résultat de l’initialisation |
| `verify agent` / `verify triggers` | Oui | Oui | Résultats de vérification pour chaque contrôle |
| `visualize` | Oui | Oui | Graphe de dépendances au format JSON |
| `describe` | Toujours JSON | N/A | Produit toujours du JSON (commande d’introspection) |
| `recap` | Oui | Oui | Historique des conversations par outil/session |
| `image generate` / `image doctor` / `image vendor list` | N/A | Oui | Utilisez `--output json` ; `vendor list` est le chemin canonique de découverte |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Oui | Utilisez `--output json` pour l’enveloppe d’exécution ou le rapport de disponibilité |
| `explain validate` | Oui | Oui | Rapport de validation de l’artefact |
| `explain render` / `explain patch` / `explain components` | Oui | Oui | Rapport de rendu : fichier, avertissements, état du sidecar |
| `explain lint` | Oui | Oui | Avertissements sur le texte |
| `diagram resolve` / `diagram update` | Oui | Oui | Résolution du moteur ou résultat du cache géré |
| `market resolve` / `market update` | Oui | Oui | État du moteur de recherche géré |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Oui | N/A | Chaque chemin docs possède ses propres options de rapport |
| `search ...` | Toujours JSON | N/A | Toutes les sous-commandes `search` écrivent du JSON ; utilisez `--pretty` pour une lecture humaine |

---

## Options par commande

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

L’installateur interactif écrit les paramètres de fournisseur sélectionnés dans `.agents/oma-config.yaml`. Les indicateurs de fournisseur sélectionnent les intégrations de recherche web, d’intelligence de code et de mémoire sémantique ; `--honcho-url` et `--honcho-workspace` configurent le service de mémoire Honcho lorsque ce fournisseur est sélectionné. L’indicateur racine `-y, --yes` s’applique lorsqu’un flux d’installation demande une confirmation.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--json` | Émet du JSON au lieu d’un texte mis en forme. | `false` |
| `--output <format>` | Format de sortie explicite (`text` ou `json`). Voir [Options de sortie](#output-options). | `text` |
| `--profile` | Affiche la matrice de santé du profil (slug de modèle résolu, CLI et état d’authentification par agent depuis le `model_preset` actif et les surcharges `agents:`). Voir [Modèles par agent](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Écrase les fichiers de configuration personnalisés pendant la mise à jour. Concerne `oma-config.yaml`, `mcp.json` et les répertoires `stack/`. Sans cette option, ces fichiers sont sauvegardés avant la mise à jour puis restaurés. | `false` |
| `--with-new-skills` | | Installe les compétences ajoutées au registre depuis l’installation actuelle. | `false` |
| `--ci` | | Exécute en mode CI non interactif. Ignore toutes les confirmations et utilise une sortie console simple au lieu des spinners et animations. Obligatoire pour les pipelines CI/CD sans stdin. | `false` |
| `--yes` | `-y` | Ignore les invites. Ne crée pas les répertoires de fournisseurs absents sauf avec `--all` ou `--vendor`. | `false` |
| `--all` | | Crée ou met à jour tous les fournisseurs pris en charge au niveau du projet. | `false` |
| `--vendor <vendors>` | | Crée ou met à jour une liste de fournisseurs séparés par des virgules, par exemple `claude,qwen`. | Répertoires de fournisseurs existants |

`oma update mcp` utilise les mêmes contrôles `--yes`, `--ci`, `--all` et `--vendor` pour choisir les serveurs MCP du navigateur. Il n’utilise ni `--force` ni `--with-new-skills`.

**Comportement avec --force :**
- `oma-config.yaml` est remplacé par la valeur par défaut du registre.
- `mcp.json` est remplacé par la valeur par défaut du registre.
- Le répertoire backend `stack/` (ressources propres au langage) est remplacé.
- Tous les autres fichiers sont toujours mis à jour, quelle que soit cette option.

**Comportement avec --ci :**
- Aucun `console.clear()` au démarrage.
- `@clack/prompts` est remplacé par `console.log` simple.
- Les invites de détection des concurrents sont ignorées.
- Les erreurs sont levées au lieu d’appeler `process.exit(1)`.

**Portée des fournisseurs :**
- `oma update` ne met à jour que les répertoires de fournisseurs déjà présents.
- `oma update --yes` utilise la même portée sans invites.
- `oma update --all` crée ou met à jour tous les fournisseurs pris en charge au niveau du projet.
- `oma update --vendor claude,qwen` crée ou met à jour uniquement les fournisseurs listés.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--json` | Émet le résultat de la réinitialisation au format JSON. | `false` |
| `--output <format>` | Émet `text` ou `json`. | `text` |

`oma stats reset` est la commande de réinitialisation. L’ancienne forme `oma stats get --reset` ne fait pas partie de la surface publique actuelle.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--interactive` | Mode interactif avec saisie manuelle. Demande un contexte supplémentaire impossible à recueillir depuis git (par exemple l’humeur ou des événements notables). | `false` |
| `--compare` | Compare la période actuelle avec la période précédente de même durée. Affiche les écarts (par exemple commits +12, lignes ajoutées -340). | `false` |

**Format de l’argument window :**
- `7d` : 7 jours
- `2w` : 2 semaines
- `1m` : 1 mois
- Omettre pour la valeur par défaut (7 jours)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Mode prévisualisation. Liste tous les éléments qui seraient nettoyés sans modifier les fichiers. Le code de sortie vaut 0 quelles que soient les constatations. | `false` |
| `--yes` | `-y` | Ignore toutes les invites de confirmation. Nettoie tout sans demander. Utile dans les scripts et la CI. | `false` |

**Ce qui est nettoyé :**
1. Fichiers PID orphelins : `/tmp/subagent-*.pid` lorsque le processus référencé ne tourne plus.
2. Fichiers journaux orphelins : `/tmp/subagent-*.log` correspondant à des PID morts.
3. Répertoires Gemini Antigravity : `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Ils accumulent l’état au fil du temps et peuvent devenir volumineux.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Lie une nouvelle tentative à l’identifiant d’exécution qui la précède. | |
| `--fallback-vendors` | — | Chaîne explicite et ordonnée de fournisseurs de repli, séparés par des virgules. | |
| `--task-id` | — | Identifiant de tâche issu du plan de session. | Identifiant de l’agent |
| `--vendor` | — | Surcharge du fournisseur CLI. L’exécution accepte `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` ou `pi`. | Résolu depuis la configuration |
| `--workspace` | `-w` | Répertoire de travail de l’agent. Si omis ou défini à `.`, le CLI détecte automatiquement l’espace de travail depuis les fichiers de configuration du monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Détecté automatiquement ou `.` |
| `--isolation` | — | Mode d’isolation : `worktree` crée un worktree git par lancement ; la valeur par défaut est `none`. | `none` |
| `--read-only` | — | Limite l’agent lancé aux outils non destructifs et supprime les indicateurs d’auto-approbation. | `false` |

**Validation :**
- `agent-id` doit être l’un de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` ne doit pas contenir `..`, `?`, `#`, `%` ni de caractères de contrôle.
- `vendor` doit être l’un de : `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Comportement propre à chaque fournisseur :**

| Fournisseur | Commande | Indicateur d’auto-approbation | Indicateur de prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (aucun) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (aucun ; le prompt est positionnel) |
| cursor | `cursor-agent` | propre au fournisseur | `-p` |
| opencode | `opencode` | propre au fournisseur | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | propre au fournisseur | `-p` |
| pi | `pi` | supprimé en mode `--read-only` | le prompt est positionnel |

Ces valeurs par défaut peuvent être remplacées dans `.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex conserve son sandbox workspace-write. oma active l’accès réseau et ajoute la racine du projet, le répertoire d’état OMA (`~/.oma`) et les caches de gestionnaires de paquets existants comme répertoires accessibles en écriture. `oma update` remplace `cli-config.yaml` ; pour définir un mode durable, utilisez donc `OMA_CODEX_SANDBOX` : `read-only`, `workspace-write` (par défaut) ou `danger-full-access` (aucun sandbox et aucune approbation).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Chemin racine pour localiser les fichiers mémoire (`.agents/state/memories/result-{agent}.md`) et les fichiers PID. | Répertoire de travail courant |

**Logique de détermination de l’état :**
1. Si `.agents/state/memories/result-{agent}.md` existe, lit l’en-tête `## Status:`. En l’absence d’en-tête, affiche `completed`.
2. Si le fichier PID existe à `/tmp/subagent-{session-id}-{agent}.pid`, vérifie si le PID est actif. Affiche `running` s’il est actif, `crashed` s’il est arrêté.
3. Si aucun des deux fichiers n’existe, affiche `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Surcharge du fournisseur CLI appliquée à tous les agents lancés. | Résolu pour chaque agent depuis la configuration |
| `--inline` | `-i` | Interprète les arguments de tâche comme des chaînes `agent:task[:workspace]` plutôt qu’un chemin de fichier. | `false` |
| `--no-wait` | | Mode en arrière-plan. Lance tous les agents puis revient immédiatement sans attendre la fin. Les PID et journaux sont enregistrés dans `.agents/results/parallel-{timestamp}/`. | `false` (attend la fin) |

**Format des tâches inline :** `agent:task` ou `agent:task:workspace`
- Le workspace est détecté en vérifiant si le dernier segment séparé par deux-points commence par `./`, `/` ou vaut `.`.
- Exemple : `backend:Implement auth API:./api` — agent=backend, task="Implement auth API", workspace=./api.
- Exemple : `frontend:Build login page` — agent=frontend, task="Build login page", workspace=auto-detected.

**Format du fichier de tâches YAML :**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--window <period>` | Période : `1d`, `3d`, `7d`, `2w`, `30d`. Ignorée lorsque `--date` est défini. | `1d` |
| `--date <date>` | Date précise (`YYYY-MM-DD`). Prioritaire sur `--window`. | |
| `--tool <tools>` | Filtre les sessions par outil. Liste séparée par des virgules : `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | tous les outils |
| `--top <n>` | Affiche uniquement les N premiers projets/sujets du résumé. | sans limite |
| `--sort <metric>` | Trie les sessions par `count` ou `duration`. | `count` |
| `--mermaid` | Affiche un diagramme de Gantt Mermaid au lieu du résumé par défaut. | `false` |
| `--graph` | Ouvre un graphe interactif dans le navigateur. Mutuellement exclusif avec `--mermaid`. | `false` |

> **Note :** la génération de fichiers de règles fournisseur (par exemple `.cursor/rules`) depuis les compétences installées est gérée par [`oma link <vendor>`](./commands.md#link), et non par une commande `export` distincte.

### search

```
oma search <subcommand> [...]
```

Le groupe `search` fournit sa propre sortie JSON (sans indicateurs `--json` / `--output`). Utilisez `--pretty` sur les sous-commandes URL/requête pour mettre les résultats en forme et reportez-vous aux options propres aux sous-commandes ci-dessous :

| Sous-commande | Options importantes |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (par défaut `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (par défaut `en`), `--format <spec>`, `--timeout` (par défaut `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (par défaut `github`), `--language`, `--repo`, `--limit` (par défaut `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | aucun (exécute les contrôles binaires de Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Codes de sortie :** `0` OK, `1` erreur, `2` bloqué, `3` introuvable, `4` entrée invalide, `5` authentification requise, `6` délai dépassé. Utilisez-les dans les scripts pour distinguer les blocages transitoires des entrées invalides.

### image

```
oma image <subcommand> [...]
```

Le format de sortie est contrôlé par chaque sous-commande via `--output <text|json>`.

`image generate` accepte :

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` résout la configuration `image:` active et l’authentification disponible. | `auto` |
| `--size <size>` | | `WxH` avec deux bords divisibles par 16, de 16 à 3840, rapport d’aspect 1:3–3:1, ou `auto`. | valeur par défaut du fournisseur |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | valeur par défaut du fournisseur |
| `--count <n>` | `-n` | Nombre d’images, 1..5. | `1` |
| `--output-dir <dir>` | | Répertoire de sortie. Doit se trouver dans `$PWD` sauf si `--allow-external-output` est défini. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Autorise les chemins `--output-dir` hors de `$PWD`. | `false` |
| `--model <name>` | | Surcharge de modèle propre au fournisseur. Le modèle antigravity est sélectionné par `agy`. | valeur par défaut du fournisseur |
| `--timeout <duration>` | | Délai par image sous forme de durée. | valeur par défaut du fournisseur |
| `--reference <path>` | `-r` | Image de référence pour le transfert de style/sujet. Répétable (`-r a.png -r b.png`) ou séparée par des virgules. Validée selon la taille (≤5 Mo), le format (PNG/JPEG/GIF/WebP via octets magiques) et la quantité (≤10). Prise en charge par `codex` et `antigravity` ; refusée avec le code de sortie 4 par `pollinations`. | |
| `--yes` | `-y` | Ignore l’invite de confirmation du coût. | `false` |
| `--no-prompt-in-manifest` | | Stocke le SHA256 du prompt au lieu du texte brut dans `manifest.json`. | `false` |
| `--dry-run` | | Affiche le plan et l’estimation du coût ; n’exécute rien. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` et `image vendor list` acceptent `--output <text|json>`. `image list-vendors` reste un alias d’aide ; `vendor list` est le chemin canonique de découverte.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` accepte les contrôles de planification et de capture `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` et `--capture-stop`. Il accepte aussi `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` et `--no-brief-in-manifest`. La capture navigateur utilise `--source web --url <url>` ; `file` est la source par défaut. Un rendu normal nécessite une composition écrite et un compositeur fonctionnel ; les remplacements sont limités au chemin de test `OMA_VIDEO_MOCK=1`.

`video doctor` signale ou installe la chaîne d’outils HyperFrames/MPT/Strudel. `compose` prépare le contrat de composition de l’exécution et `render` exécute le lint, produit le rendu et sonde la sortie. `provider list` signale l’état du fournisseur et de la clé. Consultez [Génération vidéo](../guide/video-generation.md) pour le manifeste d’exécution et la séquence de récupération.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--force` | Écrase les fichiers de schéma vides ou existants dans `.agents/state/memories/`. Sans cette option, les fichiers existants ne sont pas touchés. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Chemin vers le répertoire workspace à vérifier. | Répertoire de travail courant |

**Types d’agents :** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mesure la précision du détecteur de mots-clés sur un corpus annoté. Les seuils en pourcentage sont des gardes ; utilisez la sortie JSON lorsqu’une tâche CI doit examiner les résultats individuels. L’ancienne forme `oma verify <agent-type>` est une aide de compatibilité ; `verify agent` est le chemin enregistré.

---

## Exemples pratiques

### Pipeline CI : mise à jour et vérification

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Collecte automatisée des métriques

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Exécution batch d’agents avec surveillance de l’état

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Nettoyage en CI après les tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Vérification selon le workspace

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro avec comparaison pour les revues de sprint

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script complet de contrôle de santé

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe pour l’introspection des agents

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

## Registre public complet des options

La matrice suivante est générée depuis le registre public des commandes présent dans le dépôt. Elle sert d’index de couverture de cette page : une ligne contenant `—` n’a pas d’option propre à la commande, tandis que les indicateurs racine partagés et les alias d’aide sont décrits plus haut. Lancez `oma describe "<path>"` pour examiner l’aide d’exécution lorsqu’une grammaire de valeur change.

| Chemin de commande | Options publiques | Rôle |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Installe les compétences et configurations oh-my-agent |
| `describe` | `—` | Décrit les commandes CLI au format JSON pour l’introspection à l’exécution |
| `uninstall` | `--dry-run, -y, --yes` | Supprime les fichiers appartenant à oh-my-agent (préserve oma-config.yaml, mcp.json et les compétences écrites par l’utilisateur) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Met à jour les compétences vers la dernière version du registre |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Sélectionne les serveurs MCP du navigateur (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Régénère les fichiers des fournisseurs (.claude/, .cursor/, etc.) depuis la SSOT .agents/ |
| `intel` | `—` | Pipeline d’intelligence produit : recherche, lacunes, PRD, proposition d’issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Propose un travail produit à forte valeur depuis l’intelligence du marché et du code |
| `market` | `—` | Recherche de marché fondée sur les signaux communautaires via le moteur toujours à jour last30days |
| `market detect-trap` | `--force` | Contrôle de prévol qui refuse les requêtes piégées par les mots-clés |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Signale le moteur last30days qu’oma exécutera (version gérée, épinglée ou copie locale) et le Python utilisé |
| `market update` | `--json, --output <format>` | Télécharge la dernière version last30days dans le cache géré d’oma (~/.cache/oma-market/last30days) |
| `market run` | `—` | Exécute le moteur last30days (scripts/last30days.py) avec les arguments fournis ; --save-dir utilise par défaut market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Contrôle les installations CLI, les configurations MCP et l’état des compétences |
| `profile` | `—` | Gère les profils d’exécution OMA locaux |
| `profile list` | `--json, --output <format>` | Liste les profils locaux |
| `profile show` | `--json, --output <format>` | Affiche un profil local |
| `profile create` | `--json, --output <format>` | Crée un profil local |
| `profile use` | `--shell <shell>, --json, --output <format>` | Affiche le code shell qui active un profil existant |
| `profile run` | `—` | Exécute une commande avec OMA_PROFILE défini pour le processus enfant |
| `retro` | `--interactive, --compare, --json, --output <format>` | Rétrospective d’ingénierie avec métriques et tendances |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Récapitule l’historique des conversations des outils IA |
| `docs` | `—` | Détection de la dérive documentaire : vérifie les références et propose des mises à jour pour les documents touchés par un diff |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Extrait les références L2 des documents et signale les cibles rompues. Régénère docs/generated/doc-refs.json comme effet secondaire. Code de sortie : 0 = propre, 1 = références rompues. La vérification des URL est déléguée à `lychee` (installation : brew install lychee). |
| `docs sync` | `--json` | À partir d’un diff git, liste les documents qui référencent les fichiers modifiés. Le LLM hôte (runtime de compétence) lit cette liste et le diff, puis propose des correctifs selon le contrat SKILL.md — le CLI ne modifie jamais automatiquement les documents. Plage par défaut : --cached (modifications indexées), repli vers HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Détecte la dérive entre les sources anglaises (web/docs) et les traductions i18n (web/i18n/{lang}/...). Émet des signaux structurels (nombre de lignes, titres, horodatage du dernier commit) pour chaque paire afin que le LLM hôte décide quelles traductions synchroniser. Le CLI ne modifie jamais les traductions. |
| `docs lint` | `--json, --locales <list>` | Vérifie les anti-patterns de contenu dans les documents traduits (tirets cadratins dans les cibles CJK, etc.). Complète `oma docs i18n` (dérive structurelle) par des contrôles de style et d’anti-patterns selon oma-translation SKILL.md § Stage 4. Le CLI ne corrige jamais automatiquement : il ne fait que signaler les problèmes à restructurer au LLM hôte. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Émet des artefacts conformes aux standards depuis la SSOT .agents/ (spécification Agent Skills, paquet Agent Plugins, marketplace de plugins Claude Code, AGENTS.md, documents fournisseurs limités à cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Nettoie les processus d’agents secondaires et fichiers temporaires orphelins |
| `bridge` | `--context <name>` | Fait transiter MCP stdio vers un serveur Serena partagé par projet (démarré à la demande) |
| `verify` | `—` | Vérifie la sortie d’un agent secondaire (backend/frontend/mobile/qa/debug/pm) ou mesure la précision des déclencheurs du détecteur de mots-clés |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Mesure la précision des déclencheurs du détecteur de mots-clés sur un corpus de prompts annoté |
| `vault` | `—` | Gère les clés API et secrets dans le trousseau du système (Trousseau macOS / Secret Service Linux / Gestionnaire d’identifiants Windows) |
| `vault store` | `--value <value>` | Stocke un secret sous <name> (invite de mot de passe interactive) |
| `vault get` | `—` | Affiche la valeur stockée sur stdout (pour : export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Liste les noms des secrets stockés (les valeurs ne sont jamais affichées) |
| `vault delete` | `—` | Supprime un secret du trousseau et de l’index |
| `star` | `—` | Ajoute une étoile à oh-my-agent sur GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualise la structure du projet sous forme de graphe de dépendances |
| `search` | `—` | Primitives de recherche mécaniques : fetch, meta, rss, media, trust, code |
| `search providers` | `--json, --pretty` | Liste les fournisseurs de recherche enregistrés et inspecte la sélection sans accès réseau |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Recherche avec le fournisseur web sélectionné (Brave possède un adaptateur CLI) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Récupère une URL via le pipeline à escalade automatique |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Extrait OGP / JSON-LD / Schema.org depuis une URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Extrait les métadonnées multimédias via yt-dlp (1858 sites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Récupère via AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Résout le niveau ou score de confiance d’un domaine |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Recherche du code via gh / glab |
| `search doctor` | `—` | Contrôle les dépendances (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Récupère via le gestionnaire d’API de plateforme correspondant (phase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Diffuse une recherche par mots-clés vers les plateformes compatibles |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Découvre et analyse un flux RSS/Atom pour une URL |
| `search rss google` | `--locale <value>` | Construit une URL RSS Google News pour une requête |
| `harness` | `—` | Évalue les surcouches du harness OMA sur des tâches de dépôt isolées |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Compare une candidate .agents avec la base courante |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Dérive une fixture de régression de compétence à partir d’un incident capturé |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Promeut les incidents et optimise les compétences touchées |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Active le cycle de retour planifié et budgété d’un projet ; le mode est apply ou propose |
| `harness evolution status` | `--json, --output <format>` | Affiche la configuration, la planification, le travail en attente, les conflits et le dernier cycle |
| `harness evolution disable` | `--json, --output <format>` | Désactive le cycle de retour planifié du projet |
| `harness evolution run` | `--json, --output <format>` | Exécute un cycle avec le mode et le budget enregistrés du projet activé |
| `slide` | `—` | Boîte à outils de présentations HTML : créer, valider, exporter et modifier des jeux de diapositives 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Porte de qualité géométrique : rend les diapositives via puppeteer-core et contrôle débordements, chevauchements et taille des polices |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Fusionne les fichiers par diapositive en un livrable .html autonome |
| `slide edit` | `--workspace <path>, --port <n>` | Ouvre l’éditeur bbox dans le navigateur (serveur node:http sur 127.0.0.1, délégation au runner d’agents oma) |
| `slide doctor` | `—` | Sonde les dépendances requises (chrome, puppeteer-core) et facultatives (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Crée un nouveau répertoire de travail de diapositives avec HTML, ressources/ et meta.json de départ |
| `slide preview` | `--workspace <path>` | Construit viewer.html (composant web deck-stage et panneau de notes orateur, bascule avec `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Exporte les diapositives en PDF via puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Exporte chaque diapositive en image PNG via puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPÉRIMENTAL] Exporte en PPTX via pptxgenjs (fond rasterisé, dégradés rasterisés) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Importe un fichier .pptx en fragments de diapositives via officeparser (bunx, au mieux) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Télécharge une vidéo via yt-dlp dans ./assets/ et affiche la référence locale |
| `slide style` | `—` | Parcourt et récupère des préréglages de style visuel |
| `slide style list` | `—` | Liste les préréglages de style disponibles (index vendu + bold-template) |
| `slide style preview` | `—` | Prévisualise un préréglage de style dans le terminal |
| `slide style get` | `--refresh` | Récupère un design.md de modèle bold (main toujours à jour ; cache utilisé hors ligne) |
| `scholar` | `—` | Sidecars d’articles Knows.academy (replis OpenAlex et Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Recherche des articles (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Trouve la meilleure correspondance d’article sur knows.academy, OpenAlex et Semantic Scholar |
| `scholar get` | `--section <name>` | Récupère un sidecar (record_id Knows) ou des métadonnées de travail (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Valide un sidecar .knows.yaml ou .knows.json (v0.9.0) |
| `image` | `—` | Génération d’images IA avec plusieurs fournisseurs et délégation parallèle tenant compte de l’authentification |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Génère des images via pollinations (flux/zimage, gratuit), codex (gpt-image-2, OAuth ChatGPT) ou antigravity (gemini nano-banana via le CLI `agy`, gratuit avec connexion Gemini Code Assist) |
| `image doctor` | `--output <format>` | Contrôle l’authentification et l’état d’installation par fournisseur |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Liste les fournisseurs enregistrés et les modèles pris en charge |
| `video` | `—` | Génération de vidéos courtes, explicatives et de démonstration |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Génère un répertoire d’exécution vidéo depuis un brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Contrôle la disponibilité du fournisseur vidéo et du compositeur |
| `video compose` | `--output <format>, --refresh, --offline` | Crée le projet HyperFrames de l’exécution sur la dernière chaîne d’outils + heygen-com/hyperframes et affiche le contrat d’écriture |
| `video render` | `--output <format>` | Produit à nouveau le rendu d’un répertoire d’exécution depuis render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Liste les fournisseurs vidéo et leur disponibilité |
| `serena` | `—` | Utilitaires du cycle de vie du serveur de langage MCP Serena |
| `serena reap` | `--dry-run, --quiet` | Arrête les enfants LSP Serena inactifs pour récupérer de la mémoire (Serena se répare au prochain appel d’outil) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Installe la tâche planifiée périodique du reaper Serena (toutes les 5 minutes) |
| `serena reaper disable` | `--dry-run` | Désinstalle la tâche planifiée périodique du reaper Serena |
| `explain` | `—` | Gestion et validation qualité des artefacts d’explication |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Valide les artefacts HTML autonomes de rapports explain |
| `explain render` | `--output-file <path>, --template <name>, --theme <name>, --mode <mode>, --style <level>, --lang <code>, --archify, --no-archify, --open, --output <format>, --json` | Effectue le rendu d’un brouillon Markdown (fichier ou stdin) en une page HTML explicative autonome |
| `explain lint` | `--style <level>, --lang <code>, --output <format>, --json` | Vérifie le texte d’un brouillon (fichier ou stdin) sans effectuer de rendu |
| `explain patch` | `--panel <id>, --open, --output <format>, --json` | Remplace un panneau d’une page rendue à partir de son brouillon intégré |
| `explain components` | `--output <format>, --json` | Liste les composants utilisables dans un brouillon ou affiche la syntaxe de l’un d’eux |
| `diagram` | `—` | Assistants de moteur de diagrammes (HTML interactif archify ou repli Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Signale le moteur de diagrammes à utiliser par les workflows et l’emplacement d’archify |
| `diagram update` | `--json, --output <format>` | Télécharge la dernière version archify dans le cache géré d’oma (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Lance le CLI archify installé (doctor \| guide \| validate \| deliver \| visual-check …) avec les contrôles de mise à jour désactivés |
| `help` | `—` | Affiche les informations d’aide |
| `version` | `—` | Affiche le numéro de version |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Démarre le tableau de bord terminal (surveillance d’agents en temps réel) |
| `dashboard web` | `—` | Démarre le tableau de bord web sur http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Vérifie l’état d’authentification de tous les CLI pris en charge |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Distribue un événement de hook fournisseur via le routeur oma centralisé (conception 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Sonde la compatibilité L1 des hooks par fournisseur et affiche une matrice (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Ajoute un événement de workflow OMA L1 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migre les sessions historiques vers le profil HOME et supprime les originaux vérifiés |
| `state get` | `--json, --output <format>` | Inspecte une session OMA L1 par identifiant |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte l’état de workflow OMA L1 |
| `state repair` | `--dry-run, --json, --output <format>` | Répare les fichiers d’état de workflow OMA L1 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Vérifie les événements L1 requis pour un point de contrôle de workflow |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Liste les points de contrôle L1 decision.made requis |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Liste ou affiche les journaux d’audit d’injection par frontière (D52) |
| `state inject-log get` | `--json, --output <format>` | Liste ou affiche les journaux d’audit d’injection par frontière (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Exporte un résumé de session vers le magasin de coordination |
| `state trajectory` | `--category <category>, --open, --width <columns>, --sequence, --ascii, --json, --output <format>` | Affiche la trajectoire d’une session : événements L1 associés aux transcriptions des fournisseurs |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Vérifie si l’auto-réparation est autorisée pour un agent |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte l’état de workflow OMA L1 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte l’état de workflow OMA L1 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte l’état de workflow OMA L1 |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Vérifie les artefacts EXEC de ralph (garde anti-contournement, étape 1.3 de ralph.md) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Associe un contrat d’objectif (garde d’arrêt déterministe / budget en temps réel) à un workflow persistant actif |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Affiche les métriques de productivité |
| `stats reset` | `--json, --output <format>` | Affiche les métriques de productivité |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Charge le contexte sélectionné par graphe pour un prompt de délégation native |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Reprend les tâches incomplètes sûres en réutilisant les éléments d’acceptation actuels |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Démarre une exécution native d’agent appuyée par des éléments de preuve |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Exécute les argv de vérification après -- et enregistre leur code de sortie réel |
| `agent finish` | `--project-root <path>` | Valide un résultat d’agent natif avec ses reçus de vérification |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Lance un agent secondaire (le prompt peut être un texte inline ou un chemin de fichier) |
| `agent status` | `--project-root <path>` | Vérifie l’état des agents secondaires |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Exécute plusieurs agents secondaires en parallèle |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Effectue une revue de code avec un CLI externe (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Compare le registre des modèles aux listes de modèles des fournisseurs |
| `model probe` | `--json, --timeout <duration>` | Sonde un slug de modèle auprès de son CLI fournisseur pour vérifier son acceptation |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Exécute model:check --probe en interne et produit un correctif `models:` pour oma-config avec les candidats acceptés |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configure la connexion Honcho ou les identifiants locaux d’embeddding |
| `memory init` | `--force, --json, --output <format>` | Initialise le magasin de coordination dans .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Prépare la configuration d’un endpoint AgentMemory |
| `memory daemon` | `—` | Gère un processus daemon AgentMemory appartenant à OMA |
| `memory daemon status` | `--json, --output <format>` | Affiche l’état du daemon |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Démarre AgentMemory en arrière-plan |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Arrête le daemon AgentMemory géré par OMA |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Redémarre le daemon AgentMemory |
| `memory service` | `—` | Gère l’intégration d’AgentMemory comme service du système d’exploitation |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Installe l’intégration du service launchd/systemd d’AgentMemory |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Désinstalle l’intégration du service launchd/systemd d’AgentMemory |
| `memory status` | `--json, --output <format>` | Affiche l’état de santé du fournisseur de mémoire sémantique sélectionné |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Vide les nouvelles tentatives d’observation AgentMemory en file |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Importe l’historique de conversations d’un fournisseur dans AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient le stockage local AgentMemory : sauvegarde, purge, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient le stockage local AgentMemory : sauvegarde, purge, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient le stockage local AgentMemory : sauvegarde, purge, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient le stockage local AgentMemory : sauvegarde, purge, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Collecte les déchets de la mémoire locale du projet : purge les anciennes sessions L1 et fichiers Serena éphémères |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Arrête, sauvegarde, met à niveau, redémarre et contrôle la santé d’AgentMemory |
| `skill` | `—` | Inspecte et audite les compétences installées |
| `skill audit` | `--json, --output <format>` | Contrôle la similarité des descriptions de frontmatter entre compétences installées |
| `skill lint` | `--skill <id>, --json, --output <format>` | Détecte les défauts d’écriture par compétence (frontmatter, structure, références rompues) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Mesure le gain d’utilité par compétence (traitement contre référence sur des tâches conservées) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Optimise le SKILL.md d’une compétence pour maximiser le gain d’utilité mesuré sur les tâches conservées |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Propose et note des modifications de la procédure d’évolution sur des compétences conservées |
| `skill procedure` | `--export, --json, --output <format>` | Affiche la procédure d’évolution (prompts de l’optimiseur et du mainteneur, constitution) et ses hachages |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Agrège les exécutions d’optimisation enregistrées par résultat, mode de mémoire et procédure |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Retrace les promotions et retours arrière de SKILL.md enregistrés pour une compétence, ou pour toutes les compétences et la procédure avec `--all` |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Restaure le corps de SKILL.md remplacé par la promotion enregistrée la plus récente |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Enregistre une tâche d’agent planifiée |
| `schedule list` | `--json, --output <format>` | Liste les tâches planifiées avec l’état de dérive du système (synced/missing-in-os/orphan-in-os), regroupées par projet |
| `schedule delete` | `—` | Supprime une tâche planifiée du manifeste et du planificateur du système |
| `schedule run` | `—` | Exécute une tâche planifiée par identifiant (appelée par le planificateur du système ; normalement non lancée directement) |
| `schedule sync` | `--prune` | Ressynchronise le manifeste → planificateur du système. Utilisez --prune pour supprimer les tâches système orphelines. |
