---
title: "Options CLI"
description: "Référence des options du CLI oma : indicateurs globaux, contrôle de sortie, graphies renommées, options par commande, codes de sortie et registre généré depuis oma describe."
---

# Options CLI

## Référence rapide {#quick-reference}

| Je veux... | Utiliser |
|:-------------|:----|
| Exécuter sans invites | `-y` / `--yes` (aussi pris en compte : `OMA_YES=1`, `CI=true`) ; `oma update --ci` pour une sortie simple et non interactive |
| Obtenir du JSON | `--json`, `--output json` ou `OH_MY_AG_OUTPUT_FORMAT=json`. Voir [Options de sortie](#output-options) pour les exceptions |
| Cibler l’installation globale | `-g` / `--global`, ou `OMA_INSTALL_GLOBAL=1` ; `OMA_HOME` déplace la racine de stockage globale |
| Prévisualiser avant toute modification | `--dry-run` lorsqu’une commande le propose. Voir [Commandes prenant en charge JSON](#commands-supporting-json-output) |
| Voir les indicateurs d’une commande | `oma <command> --help`, `oma describe "<command>"` ou le [registre](#complete-public-option-registry) à la fin de cette page |
| Corriger un script cassé après une mise à niveau | [Commandes et options renommées](#renamed-commands-and-options) |
| Réagir aux échecs dans un script | [Codes de sortie](#exit-codes) |

---

## Options globales {#global-options}

Ces options sont disponibles sur la commande racine `oma` / `oh-my-agent` :

| Option | Description |
|:-----|:-----------|
| `-g, --global` | Agit sur l’installation globale OMA (`~/.oma/.agents/`, ou `$OMA_HOME/.agents/`) au lieu de `<cwd>/.agents/` |
| `-y, --yes` | Ignore les invites lorsque la commande sélectionnée prend en charge la confirmation ; les contrôles de sécurité propres à la commande restent appliqués. Prend aussi en compte `OMA_YES=1` et `CI=true` |
| `-V, --version` | Affiche le numéro de version puis quitte |
| `-h, --help` | Affiche l’aide de la commande |

Toutes les sous-commandes prennent aussi en charge `-h, --help` pour afficher leur aide spécifique.

`--global` définit la racine d’installation pour tout le processus : `install`, `update`, `link` et `uninstall` résolvent donc vers l’installation globale, quel que soit le répertoire courant :

| Mode | Comment le sélectionner | Emplacement de `.agents/` |
|:-----|:-----------------|:--------------------|
| Projet (par défaut) | rien | `<cwd>/.agents/` |
| Global | `--global` ou `OMA_INSTALL_GLOBAL=1` | `$OMA_HOME/.agents/` (par défaut `~/.oma/.agents/`) |

`OMA_HOME=<abs-path>` change la racine de stockage globale ; il doit s’agir d’un chemin absolu. Les installations de projet utilisent toujours cwd. Lancez `oma home --json` pour afficher les emplacements résolus, et `oma home migrate --dry-run` pour prévisualiser une migration des anciennes données. Voir [Installation globale](../guide/global-install.md).

---

## Commandes et options renommées {#renamed-commands-and-options}

Les chemins de commande utilisent des espaces, et non des deux-points, et plusieurs commandes et options ont été renommées. Les anciennes graphies sont rejetées, et non conservées comme alias :

- Une ancienne commande échoue avec `Unknown command: ... Use oma --help.` ou `Unexpected argument for oma <group>. Use --help.`
- Les noms de groupe seuls `dashboard`, `state` et `stats` affichent désormais l’aide du groupe au lieu de s’exécuter.
- Une ancienne option échoue avec `Removed option <old>. Use <new>.` ; les indicateurs d’action supprimés de `state` et `stats` échouent avec `Removed option <old>. Use an explicit action; see oma --help.`

Seuls `schedule:run` et `serena daemon:gc` sont encore résolus, afin que les entrées du planificateur du système écrites par des versions antérieures continuent de fonctionner.

| Ancienne commande | À utiliser désormais |
|:------------|:--------|
| tout chemin à deux-points `a:b` (`agent:spawn`, `state:emit`, ...) | le chemin séparé par des espaces (`agent spawn`, `state emit`) |
| `dashboard`, `dashboard:web` | `dashboard terminal`, `dashboard web` |
| `hook --vendor ...` | `hook run --vendor ...` |
| `intel run` | `intel suggest` |
| `state`, `state:get <id>` | `state list`, `state get <id>` |
| `state --activate` / `--archive` / `--purge` | `state activate` / `state archive` / `state purge` |
| `state:required-decisions` | `state decisions list` |
| `state:inject-log ... --entry <file>` | `state inject-log list`, `state inject-log get <session-id> <file>` |
| `stats`, `stats --reset` | `stats get`, `stats reset` |
| `memory:retry-drain` | `memory retry drain` |
| `vault rm` | `vault delete` |
| `search api <url>`, `search rss <url>` | `search api fetch <url>`, `search rss fetch <url>` |
| `search api:search`, `search rss:google` | `search api search`, `search rss google` |
| `skills audit` / `lint` / `eval` / `promotions` / `rollback` / `procedure` / `meta-optimize` / `evolution-stats` | `skill ...` (singulier ; `skills matrix` conserve le pluriel) |
| `skills opt` | `skill optimize` |
| `slide new`, `slide viewer` | `slide create`, `slide preview` |
| `slide pdf` / `png` / `pptx` | `slide export pdf` / `png` / `pptx` |
| `slide import-pptx`, `slide fetch-video`, `slide styles ...` | `slide import pptx`, `slide asset fetch-video`, `slide style ...` |
| `image list-vendors`, `video list-providers` | `image vendor list`, `video provider list` |
| `schedule:add`, `schedule:remove` | `schedule create`, `schedule delete` |
| `verify <agent-type>` | `verify agent <agent-type>` |

| Ancienne option | À utiliser désormais |
|:-----------|:--------|
| `-m, --model <vendor>` | `--vendor <vendor>` |
| `-r, --root <path>` | `--project-root <path>` |
| `--sid`, `--session` | `--session-id <id>` |
| `--format <fmt>` | `--output <format>` (`search media --format` est inchangé) |
| `--out <dir>`, `--out-dir` | `--output-dir <path>` |
| `--out <file>`, `--out-file` | `--output-file <path>` ; `--report-file <path>` sur `slide validate` et `explain validate` |
| `--dir` | `--workspace <path>` sur les commandes `slide`, `--output-dir <path>` sur `slide create`, `--input-dir <path>` sur `explain validate` |
| `--max` | `--limit <n>` sur `scholar search` |
| `--allow-external-out` | `--allow-external-output` |
| `--timeout <seconds>`, `--timeout <ms>`, `--timeout-minutes` | `--timeout <duration>` (`30s`, `2m`). Une unité est obligatoire là où l’ancienne valeur était en millisecondes ou en minutes |
| `--max-age-days` | `--max-age <duration>` ; `--expires-after <duration>` sur `schedule create` |

---

## Options de sortie {#output-options}

De nombreuses commandes prennent en charge une sortie lisible par machine pour les pipelines CI/CD et l’automatisation. Il existe trois manières de demander une sortie JSON.

### 1. Indicateur --json {#1---json-flag}

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

L’indicateur `--json` est disponible uniquement sur les chemins qui l’annoncent. Ne déduisez pas sa prise en charge à partir d’une famille de commandes : par exemple, les feuilles `image`, `video` et `slide` exposent `--output` lorsque le registre le liste, tandis que `search` affiche toujours du JSON.

### 2. Indicateur --output {#2---output-flag}

```bash
oma stats get --output json
oma doctor --output text
```

Sur la plupart des commandes, `--output` accepte `text` ou `json`. Il offre la même fonction que `--json` tout en permettant de demander explicitement une sortie texte, ce qui est utile lorsque la variable d’environnement vaut `json`.

**Validation :** si un format invalide est fourni, le CLI lève : `Invalid output format: {value}. Expected one of text, json`.

### 3. Variable d’environnement OH_MY_AG_OUTPUT_FORMAT {#3-oh_my_ag_output_format-environment-variable}

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Définissez cette variable d’environnement à `json` pour faire du JSON la sortie par défaut sur les commandes qui la prennent en charge. Seule la valeur `json` est reconnue ; toute autre valeur est ignorée et la sortie reste en texte.

### Comment le format est choisi {#how-the-format-is-chosen}

Un indicateur sur la ligne de commande l’emporte sur la variable d’environnement. Passer à la fois `--json` et un `--output` non JSON est une erreur, et non une règle de priorité.

| Vous passez | Variable non définie | `OH_MY_AG_OUTPUT_FORMAT=json` |
|:---------|:---------------|:------------------------------|
| rien | texte | JSON |
| `--json` ou `--output json` | JSON | JSON |
| `--output text` | texte | texte |
| `--json --output text` | erreur : `--json conflicts with --output. Choose one output format.` | même erreur |

Certaines commandes utilisent leurs propres valeurs de format :

| Commandes | Contrôle du format |
|:---------|:---------------|
| `search ...` | Toujours JSON ; `--pretty` ne fait qu’indenter. `search providers` et `search web` acceptent aussi `--json` |
| `describe` | Toujours JSON |
| `image ...`, `video ...` | `--output text\|json` (par défaut `text`) |
| `slide validate` | `--output json\|concise` (par défaut `concise`) |
| `explain validate` | `--output concise\|json` (par défaut `concise`) ou `--json` |
| `hook probe` | `--output text\|md\|json` |

### Commandes prenant en charge JSON {#commands-supporting-json-output}

Chaque commande qui accepte `--json` ou `--output` signale `supportsJsonOutput: true` dans `oma describe`, et le [registre](#complete-public-option-registry) à la fin de cette page liste les indicateurs de chaque chemin. Les commandes qui affichent toujours du JSON sans indicateur (`describe` et la plupart des sous-commandes `search`) ne sont pas marquées. Pour lister les chemins depuis le CLI :

```bash
oma describe | jq -r '.. | objects | select(.supportsJsonOutput? == true) | .path'
```

Utilisez `select(.supportsDryRun? == true)` de la même manière pour trouver les commandes dotées de `--dry-run`.

---

## Options par commande {#per-command-options}

### install

```text
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

L’installateur interactif écrit les paramètres de fournisseur sélectionnés dans `.agents/oma-config.yaml`. Les indicateurs de fournisseur sélectionnent les intégrations de recherche web, d’intelligence de code et de mémoire sémantique ; `--honcho-url` et `--honcho-workspace` configurent le service de mémoire Honcho lorsque ce fournisseur est sélectionné. L’indicateur racine `-y, --yes` s’applique lorsqu’un flux d’installation demande une confirmation.

### doctor

```text
oma doctor [--json] [--output <format>] [--profile] [--heal-check <agentType>]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--json` | Émet du JSON au lieu d’un texte mis en forme. | `false` |
| `--output <format>` | Format de sortie explicite (`text` ou `json`). Voir [Options de sortie](#output-options). | `text` |
| `--profile` | Affiche la matrice de santé du profil (slug de modèle résolu, CLI et état d’authentification par agent depuis le `model_preset` actif et les surcharges `agents:`). Voir [Modèles par agent](../guide/per-agent-models.md). | `false` |
| `--heal-check <agentType>` | Inclut le contrôle de la porte d’auto-réparation pour un agent. | |

Avec `--json`, le rapport contient les champs de premier niveau `ok` et `issues`, et `doctor` quitte avec le code `1` lorsque `issues` est supérieur à zéro.

### update

```text
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
| `--vendor <vendors>` | | Crée ou met à jour une liste de fournisseurs séparés par des virgules, par exemple `claude,qwen`. | Répertoires de fournisseurs existants uniquement |

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

```text
oma stats get [--json | --output <format>]
oma stats reset [--json | --output <format>]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--json` | Émet du JSON. `stats get` affiche l’objet des métriques ; `stats reset` affiche `{"reset":true}`. | `false` |
| `--output <format>` | Émet `text` ou `json`. | `text` |

`oma stats reset` est la commande de réinitialisation ; `oma stats get --reset` échoue avec `Removed option --reset`.

:::note
`stats get` n’est pas en lecture seule. Chaque appel compte comme une session et ajoute le diff des 10 derniers commits aux compteurs cumulés de fichiers et de lignes dans `.agents/state/metrics.json` : ne l’interrogez donc pas en boucle.
:::

### retro

```text
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--interactive` | Saisie guidée historique : demande ce que vous avez accompli, les principaux enseignements et les prochaines étapes. Ignore la période, `--compare` et `--json`. | `false` |
| `--compare` | Compare la période actuelle avec la période précédente de même durée. Affiche les écarts (par exemple commits +12, lignes ajoutées -340). | `false` |

**Format de l’argument window :** un nombre suivi de `h`, `d` ou `w`.
- `24h` : 24 heures
- `7d` : 7 jours
- `2w` : 2 semaines
- Omettre pour la valeur par défaut (7 jours)

Les mois ne sont pas pris en charge : `oma retro 1m` échoue avec `Invalid window: 1m. Use: 24h, 7d, 14d, 30d, 2w`.

### cleanup

```text
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Mode prévisualisation. Liste tous les éléments qui seraient nettoyés sans rien modifier. Le code de sortie vaut 0 quelles que soient les constatations. | `false` |
| `--yes` | `-y` | Ignore toutes les invites de confirmation. Nettoie tout sans demander. Utile dans les scripts et la CI. | `false` |

**Ce qui est nettoyé :**
1. Fichiers PID orphelins : `/tmp/subagent-*.pid` lorsque le processus référencé ne tourne plus.
2. Fichiers journaux orphelins : `/tmp/subagent-*.log` correspondant à des PID morts.
3. Répertoires Gemini Antigravity : `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Ils accumulent l’état au fil du temps et peuvent devenir volumineux.

### agent spawn

```text
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Lie une nouvelle tentative à l’identifiant d’exécution qui la précède. | |
| `--fallback-vendors` | — | Chaîne explicite et ordonnée de fournisseurs de repli, séparés par des virgules. | |
| `--task-id` | — | Identifiant de tâche issu du plan de session. | Identifiant de l’agent |
| `--vendor` | — | Surcharge du fournisseur CLI. `--help` liste `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` et `pi`. | Résolu depuis la configuration |
| `--workspace` | `-w` | Répertoire de travail de l’agent. Si omis ou défini à `.`, le CLI détecte automatiquement l’espace de travail depuis les fichiers de configuration du monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Détecté automatiquement ou `.` |
| `--isolation` | — | Mode d’isolation : `worktree` crée un worktree git par lancement ; la valeur par défaut est `none`. | `none` |
| `--read-only` | — | Limite l’agent lancé aux outils non destructifs et supprime les indicateurs d’auto-approbation. | `false` |

**Validation :**
- `agent-id` et `session-id` ne doivent pas contenir `..`, `?`, `#`, `%` ni de caractères de contrôle. `agent spawn` n’a pas de liste fixe d’identifiants d’agent ; le routage des modèles et des fournisseurs reconnaît `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` et `explore`, ainsi que des alias tels que `backend-engineer`, `qa-reviewer` et `research-explorer`.
- `--vendor` doit être un identifiant de fournisseur oma : `antigravity`, `claude`, `codex`, `commandcode`, `copilot`, `cursor`, `grok`, `hermes`, `kimi`, `kiro`, `opencode`, `pi`, `qwen` ou `zcode`. Le tableau ci-dessous couvre les huit fournisseurs que `--help` nomme.

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

```text
oma agent status <session-id> [agent-ids...] [--project-root <path>]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--project-root <path>` | Projet dont le registre des exécutions d’agents et les fichiers `.agents/state/memories/result-{agent}.md` sont lus. `-r` et `--root` ont été supprimés et échouent avec `Removed option -r. Use --project-root.` | Répertoire de travail courant |

La commande affiche une ligne `{agent-id}:{status}` par agent demandé. Pour chaque agent, elle utilise la première source qui existe :

```mermaid
flowchart TD
  start["agent status SESSION AGENT"] --> reg{"Run for this session and agent in the agent-run registry?"}
  reg -->|yes| regStatus["Registry status, downgraded to failed or stale"]
  reg -->|no| result{"result-AGENT.md exists?"}
  result -->|yes| legacy["legacy-STATUS, or unverified without a header"]
  result -->|no| statusFile{"subagent-SESSION-AGENT.status in the OS temp dir?"}
  statusFile -->|yes| exited["legacy-completed, or the status in the file"]
  statusFile -->|no| pidFile{"subagent-SESSION-AGENT.pid alive?"}
  pidFile -->|yes| running["running"]
  pidFile -->|"no, or no PID file"| crashed["crashed"]
```

| État | Signification |
|:-------|:--------|
| `running`, `completed`, `partial`, `blocked`, `failed` | État enregistré dans le registre des exécutions d’agents |
| `failed` | Également signalé lorsqu’une exécution enregistrée est `running` mais que son processus d’exécution a disparu |
| `stale` | L’exécution enregistrée est `completed`, mais ses éléments de preuve de résultat ne sont plus valides |
| `legacy-<status>` | Aucune exécution enregistrée ; `result-{agent}.md` contient un en-tête `## Status: <status>` |
| `unverified` | Aucune exécution enregistrée ; `result-{agent}.md` n’a pas d’en-tête d’état |
| `legacy-completed` | Aucune exécution ni fichier de résultat ; le fichier `.status` de la session indique `completed` (toute autre valeur est affichée telle quelle) |
| `crashed` | Rien n’a été trouvé, ou l’ancien fichier PID pointe vers un processus arrêté |

Consultez [Résultats d’agents et reprise](../guide/agent-results-and-resume.md) pour savoir comment les exécutions sont enregistrées.

### agent parallel

```text
oma agent parallel [tasks...] [--session-id <id>] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--session-id <id>` | — | Identifiant de session de chaque exécution lancée. Passez le même identifiant à `oma agent status`. | Nom du répertoire d’exécution, `parallel-<timestamp>-<suffix>` |
| `--vendor` | — | Surcharge du fournisseur CLI appliquée à tous les agents lancés. | Résolu pour chaque agent depuis la configuration |
| `--inline` | `-i` | Interprète les arguments de tâche comme des chaînes `agent:task[:workspace]` plutôt qu’un chemin de fichier. | `false` |
| `--no-wait` | | Mode en arrière-plan. Lance tous les agents puis revient immédiatement sans attendre la fin. Les PID et journaux sont enregistrés dans `.agents/results/parallel-<timestamp>-<suffix>/`. | `false` (attend la fin) |

**Format des tâches inline :** `agent:task` ou `agent:task:workspace`
- Le workspace est détecté en vérifiant si le dernier segment séparé par deux-points commence par `./`, `/` ou vaut `.`.
- Exemple : `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Exemple : `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-detected.

**Format du fichier de tâches YAML :**

```yaml
tasks:
  - id: api            # optional; default <agent>-<index>
    agent: backend
    task: "Implement user API"
    workspace: ./api   # optional; auto-detected when omitted
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```text
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--window <period>` | Période au format `<n>h`, `<n>d` ou `<n>w` (par exemple `1d`, `3d`, `7d`, `2w`, `30d`). Les valeurs supérieures à 30 jours sont plafonnées à 30 jours avec un avertissement. Ignorée lorsque `--date` est défini. | `1d` |
| `--date <date>` | Date précise (`YYYY-MM-DD`). Prioritaire sur `--window`. | |
| `--tool <tools>` | Filtre les sessions par outil. Liste séparée par des virgules : `antigravity`, `claude`, `codex`, `cursor`, `gemini`, `grok`, `qwen`. | tous les outils |
| `--top <n>` | Affiche uniquement les N premiers projets/sujets du résumé. | sans limite |
| `--sort <metric>` | Trie les sessions par `count` ou `duration`. | `count` |
| `--mermaid` | Affiche un diagramme de Gantt Mermaid au lieu du résumé par défaut. `--json` est prioritaire. | `false` |
| `--graph` | Ouvre le graphe interactif dans le tableau de bord web (`/recap`). Prioritaire sur `--mermaid` et `--json`. | `false` |

### search

```text
oma search <subcommand> [...]
```

Chaque sous-commande `search` écrit du JSON sur stdout sans aucun indicateur ; `providers` et `web` acceptent aussi `--json`. Aucune n’accepte `--output`. `--pretty` ne modifie que l’indentation.

| Sous-commande | Options importantes |
|:-----------|:---------------|
| `providers` | `--json`, `--pretty` |
| `web <query>` | `--provider <id>`, `--limit <n>` (par défaut `10`), `--timeout <duration>` (par défaut `15s`), `--json`, `--pretty` |
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout <duration>` (par défaut `15s`), `--locale`, `--pretty` |
| `meta <url>` / `archive <url>` / `api fetch <url>` / `rss fetch <url>` | `--timeout <duration>` (par défaut `15s`), `--locale` (par défaut `en-US,en;q=0.9`), `--pretty` |
| `api search <query>` | `--platforms <list>`, `--timeout <duration>`, `--locale`, `--pretty` |
| `rss google <query>` | `--locale` (par défaut `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (par défaut `en`), `--format <spec>`, `--timeout <duration>` (par défaut `30s`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (par défaut `github`), `--language`, `--repo`, `--limit` (par défaut `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | aucune (exécute les contrôles binaires de Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

`search` utilise l’échelle de codes de sortie partagée ; voir [Codes de sortie](#exit-codes).

### image

```text
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

`image doctor` et `image vendor list` acceptent `--output <text|json>`. Utilisez `image vendor list` pour découvrir les fournisseurs ; l’ancienne graphie `image list-vendors` échoue.

### video

```text
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` accepte les contrôles de planification et de capture `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` et `--capture-stop`. Il accepte aussi `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` et `--no-brief-in-manifest`. La capture navigateur utilise `--source web --url <url>` ; `file` est la source par défaut. Un rendu normal nécessite une composition écrite et un compositeur fonctionnel ; les remplacements sont limités au chemin de test `OMA_VIDEO_MOCK=1`.

`video doctor` signale ou installe la chaîne d’outils HyperFrames/MPT/Strudel. `compose` prépare le contrat de composition de l’exécution et `render` exécute le lint, produit le rendu et sonde la sortie. `provider list` signale l’état du fournisseur et de la clé. Consultez [Génération vidéo](../guide/video-generation.md) pour le manifeste d’exécution et la séquence de récupération.

### memory init

```text
oma memory init [--json] [--output <format>] [--force]
```

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--force` | Écrase les fichiers de schéma vides ou existants dans `.agents/state/memories/`. Sans cette option, les fichiers existants ne sont pas touchés. | `false` |

### verify

```text
oma verify agent <agent-type> [-w <workspace>] [--session-id <id>] [--task-id <id>] [--run-id <id>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Option | Court | Description | Valeur par défaut |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Chemin vers le répertoire workspace à vérifier. | Répertoire de travail courant |
| `--session-id <id>` | | Sélectionne le plan de session et les rapports. Obligatoire lorsque plusieurs plans existent, sauf si un reçu d’exécution identifie la session. | |
| `--task-id <id>` | | Sélectionne la portée et le rapport d’une tâche. Nécessite `--session-id` ou `--run-id`. | |
| `--run-id <id>` | | Sélectionne le rapport d’exécution exact. Déduit la session et la tâche du reçu local ; en son absence, fournissez explicitement les deux identifiants. | |

**Types d’agents :** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mesure la précision du détecteur de mots-clés sur un corpus annoté. Les seuils en pourcentage sont des portes ; utilisez la sortie JSON lorsqu’une tâche CI doit examiner les résultats individuels. L’ancienne forme `oma verify <agent-type>` échoue ; utilisez `verify agent <agent-type>`.

---

## Codes de sortie {#exit-codes}

**Échelle partagée (`image`, `video`, `search`) :**

| Code | Signification |
|:-----|:--------|
| `0` | succès |
| `1` | erreur générique |
| `2` | bloqué, ou refus de sécurité du fournisseur |
| `3` | introuvable |
| `4` | entrée invalide |
| `5` | authentification requise, ou binaire du fournisseur non installé |
| `6` | délai dépassé |

**Propres à une commande :**

| Commande | Codes |
|:--------|:------|
| `doctor --json` | `0` aucun problème, `1` un ou plusieurs problèmes |
| `verify agent` | `0` tous les contrôles réussissent, `1` un contrôle a échoué ou le type d’agent est invalide, `2` workspace introuvable |
| `verify triggers` | `0` dans les seuils, `1` un seuil dépassé |
| `docs verify` | `1` références rompues trouvées |
| `vault get` | `1` nom de clé invalide, `2` entrée inexistante |

---

## Exemples pratiques {#practical-examples}

### Pipeline CI : mise à jour et vérification {#ci-pipeline-update-and-verify}

```bash
# Update in CI mode, then fail the job when doctor reports any issue
oma update --ci
oma doctor --json | jq -e '.ok' > /dev/null
```

### Exécution batch d’agents avec surveillance de l’état {#batch-agent-execution-with-status-monitoring}

```bash
# Choose the session ID first and pass it to both commands
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent parallel tasks.yaml --session-id "$SESSION_ID" --no-wait

# Check status every 5 seconds
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
# Without `watch` (stock macOS), loop instead:
# while sleep 5; do oma agent status "$SESSION_ID" backend frontend mobile; done
```

### Nettoyage en CI après les tests {#cleanup-in-ci-after-tests}

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Vérification selon le workspace {#workspace-aware-verification}

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro avec comparaison pour les revues de sprint {#retro-with-comparison-for-sprint-reviews}

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare
```

### Script complet de contrôle de santé {#full-health-check-script}

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== oh-my-agent Health Check ==="

report="$(mktemp)"
# doctor exits 1 when it finds issues; keep the report and continue
oma doctor --json > "$report" || true

# Check CLI installations
jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version // "unknown"))" else "MISSING" end)"' "$report"
jq -r '"Issues: \(.issues)"' "$report"

# Check auth status (an object of booleans keyed by github and each vendor ID)
oma auth status --json | jq -r 'to_entries[] | "\(.key): \(if .value then "authenticated" else "not authenticated" end)"'

echo "=== Done ==="
```

### Describe pour l’introspection des agents {#describe-for-agent-introspection}

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

---

## Registre public complet des options {#complete-public-option-registry}

Chaque ligne est un chemin de commande qui s’exécute seul ; les groupes qui ne font qu’afficher l’aide sont omis, et les indicateurs racine partagés sont décrits dans [Options globales](#global-options). Les valeurs par défaut figurent à côté de leur option. Lancez `oma describe "<path>"` pour obtenir le JSON complet d’un chemin.

:::note
Ce tableau est généré depuis `oma describe`. Ne le modifiez pas à la main : lancez `node cli/scripts/generate-cli-reference.mjs` pour le régénérer, ou ajoutez `--check` pour échouer lorsqu’il est obsolète.
:::

<!-- oma:generated cli-registry:start -->

| Command | Arguments | Options | Description |
|:--|:--|:--|:--|
| `agent begin` | `<agent-id> <task-id> <session-id>` | `--project-root <path>`, `-w, --workspace <path>` | Start an evidence-backed native agent run |
| `agent context` | `<agent-id>` | `--project-root <path>`, `--difficulty <level>` (default: `Medium`) | Load graph-selected context for a native dispatch prompt |
| `agent finish` | `<run-id> <result-file>` | `--project-root <path>` | Validate a native agent result against its verification receipts |
| `agent parallel` | `[tasks...]` | `--session-id <id>`, `--vendor <vendor>`, `-i, --inline`, `--no-wait` | Run multiple sub-agents in parallel |
| `agent parallel-supervisor` | `<manifest>` | — | — |
| `agent resume` | `<session-id>` | `--project-root <path>`, `--dry-run`, `--max-attempts <count>` (default: `3`) | Resume safe incomplete tasks, reusing current acceptance evidence |
| `agent review` | — | `--vendor <vendor>`, `-p, --prompt <prompt>`, `-w, --workspace <path>`, `--no-uncommitted` | Run code review using external CLI (codex/claude/qwen/grok) |
| `agent spawn` | `<agent-id> <prompt> <session-id>` | `--resumed-from <run-id>`, `--fallback-vendors <vendors>`, `--task-id <id>`, `--vendor <vendor>`, `-w, --workspace <path>`, `--isolation <mode>`, `--read-only` | Spawn a subagent (prompt can be inline text or a file path) |
| `agent status` | `<session-id> [agent-ids...]` | `--project-root <path>` (default: current directory) | Check status of subagents |
| `agent verify` | `<run-id> [command...]` | `--project-root <path>`, `--required`, `--affected <paths...>` | Execute verification argv after -- and record its real exit code |
| `auth status` | — | `--json`, `--output <format>` | Check authentication status of all supported CLIs |
| `bridge` | `[url]` | `--context <name>` (default: `ide`), `--oma-home <path>`, `--oma-state-home <path>` | Proxy MCP stdio to a shared per-project Serena server (started on demand) |
| `cleanup` | — | `--dry-run`, `-y, --yes`, `--json`, `--output <format>` | Clean up orphaned subagent processes and temp files |
| `dashboard terminal` | — | `--project-root <path>` | Start terminal dashboard (real-time agent monitoring) |
| `dashboard web` | — | `--project-root <path>` | Start web dashboard on http://127.0.0.1:9847 |
| `describe` | `[command-path]` | — | Describe CLI commands as JSON for runtime introspection |
| `diagram archify` | `[args...]` | — | Run the installed archify CLI (doctor \| guide \| validate \| deliver \| visual-check …) with update checks disabled |
| `diagram resolve` | — | `--engine <engine>`, `--refresh`, `--offline`, `--json`, `--output <format>` | Report which diagram engine workflows should use, and where archify lives |
| `diagram update` | — | `--json`, `--output <format>` | Download the latest archify release into oma's managed cache (~/.cache/oma-diagram/archify) |
| `docs i18n` | — | `--json`, `--min-severity <level>` (default: `MEDIUM`) | Detect drift between English source docs (web/docs) and i18n translations (web/i18n/{lang}/...). Emits structural signals (line count, heading count, last-commit timestamp) per pair so the host LLM can decide which translations need a diff-sync patch. The CLI never edits translations. |
| `docs lint` | — | `--json`, `--locales <list>` | Lint translated docs for content-level anti-patterns (em-dashes in CJK targets, etc.). Complements `oma docs i18n` (structural drift) with style/anti-pattern checks per oma-translation SKILL.md § Stage 4. The CLI never auto-fixes — it only reports issues for the host LLM to restructure. |
| `docs sync` | `[diff-range]` | `--json` | Given a git diff, list docs that reference changed files. The host LLM (skill runtime) is expected to read this list plus the diff and propose patches per the SKILL.md contract — the CLI never auto-edits docs. Default diff-range: --cached (staged changes), fallback to HEAD~1..HEAD. |
| `docs verify` | `[path]` | `--json`, `--report-file <path>`, `--no-urls`, `--urls-sync` | Extract L2 references from docs and report broken targets. Regenerates docs/generated/doc-refs.json as a side effect. Exit code: 0 = clean, 1 = broken refs found. URL link checking is delegated to `lychee` (install: brew install lychee). |
| `doctor` | — | `--profile`, `--heal-check <agentType>`, `--json`, `--output <format>` | Check CLI installations, MCP configs, and skill status |
| `emit` | — | `--target <target>` (default: `all`), `--output-dir <path>` (default: `.`), `--json`, `--output <format>` | Emit standards-conformant artifacts from the .agents/ SSOT (Agent Skills spec, Agent Plugins package, Claude Code plugin marketplace, AGENTS.md, cli/AGENTS.md) |
| `explain components` | `[name]` | `--json`, `--output <format>` | List the components a draft can use, or print one component's syntax |
| `explain lint` | `[file]` | `--style <level>`, `--lang <code>`, `--json`, `--output <format>` | Check the prose of a draft (file or stdin) without rendering |
| `explain patch` | `<html> [file]` | `--panel <id>`, `--open`, `--json`, `--output <format>` | Replace one panel of a rendered page from its embedded draft (new panel from file or stdin) |
| `explain render` | `[file]` | `--output-file <path>`, `--template <name>`, `--theme <name>`, `--mode <mode>`, `--style <level>`, `--lang <code>`, `--archify`, `--no-archify`, `--open`, `--json`, `--output <format>` | Render a Markdown draft (file or stdin) into one self-contained HTML explanation |
| `explain validate` | `[file]` | `--input-dir <path>`, `--output <format>` (default: `concise`), `--report-file <path>`, `--json` | Validate self-contained explain HTML report artifacts |
| `goal set` | — | `--workflow <name>`, `--session-id <id>`, `--gate <keyword>`, `--budget-minutes <n>`, `--description <text>`, `--json`, `--output <format>` | Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow |
| `harness eval` | — | `--suite <path>`, `--candidate <path>`, `--partition <name>` (default: `validation`), `--mock`, `--action <mode>`, `--transcript <path>`, `--live`, `--record`, `--record-file <path>`, `--yes`, `--timeout <duration>` (default: `15m`), `--require-coverage`, `--json`, `--output <format>` | Compare a candidate .agents overlay with the current baseline |
| `harness evolution disable` | — | `--json`, `--output <format>` | — |
| `harness evolution enable` | — | `--max-dispatches <n>`, `--cron <expr>` (default: `0 3 * * *`), `--mode <mode>` (default: `apply`), `--json`, `--output <format>` | — |
| `harness evolution run` | — | `--scheduled`, `--json`, `--output <format>` | — |
| `harness evolution status` | — | `--json`, `--output <format>` | — |
| `harness feedback` | — | `--live`, `--apply`, `--max-epochs <n>` (default: `1`), `--incident <ids...>`, `--scan-runs`, `--json`, `--output <format>` | Promote captured incidents to skill fixtures and optimize the affected skills |
| `harness incident capture` | — | `--spec <path>`, `--run <id>`, `--json`, `--output <format>` | — |
| `harness incident export` | `<id>` | `--json`, `--output <format>` | — |
| `harness incident promote` | `<id>` | `--skill <id>`, `--draft`, `--force`, `--json`, `--output <format>` | — |
| `harness incident reproduce` | `<id>` | `--candidate <path>`, `--action <mode>`, `--record-file <path>`, `--transcript <path>`, `--record`, `--yes`, `--timeout <duration>` (default: `15m`), `--json`, `--output <format>` | — |
| `harness incident scan` | — | `--limit <n>`, `--skeleton <run-id>`, `--json`, `--output <format>` | List failed, blocked, or partial agent runs that no captured incident references yet |
| `harness incident show` | `<id>` | `--json`, `--output <format>` | — |
| `help` | — | — | Show help information |
| `home` | — | `--json`, `--output <format>` | Inspect and migrate OMA global storage |
| `home migrate` | — | `--dry-run`, `--json`, `--output <format>` | Copy legacy OMA global files; preserve originals |
| `hook probe` | — | `--vendor <list>`, `--output <format>` (default: `text`), `--hooks-dir <dir>` | Probe per-vendor L1 hook compatibility and print a matrix (D63) |
| `hook run` | — | `--vendor <v>`, `--event <e>`, `--matcher <m>` | Dispatch a vendor hook event through the centralised oma hook router (design 019) |
| `hook script` | — | `--vendor <v>`, `--script <name>` | Run one installed hook handler through the CLI memory adapter |
| `image doctor` | — | `--output <format>` (default: `text`) | Check authentication and install status per vendor |
| `image generate` | `<prompt...>` | `--vendor <name>` (default: `auto`), `--size <size>`, `--quality <level>`, `-n, --count <n>`, `--output-dir <path>`, `--allow-external-output`, `--model <name>`, `--timeout <duration>`, `-r, --reference <path>`, `-y, --yes`, `--no-prompt-in-manifest`, `--dry-run`, `--output <format>` (default: `text`) | Generate images via pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), or antigravity (gemini nano-banana via `agy` CLI, free with Gemini Code Assist sign-in) |
| `image vendor list` | — | `--output <format>` (default: `text`) | List registered vendors and supported models |
| `install` | — | `--web-search <provider>`, `--code-intelligence <provider>`, `--semantic-memory <provider>`, `--honcho-url <url>`, `--honcho-workspace <id>` | Install oh-my-agent skills and configurations |
| `intel suggest` | — | `--config <path>`, `--topic <topic>`, `--target <target>`, `--repos <repos>`, `--since <window>`, `--last-commits <n>`, `--output-dir <path>`, `--dry-run`, `--fixture <path>`, `--create-issue`, `--base-repo <owner/name>`, `--yes`, `--json`, `--output <format>` | Suggest high-value product work from market/code intelligence |
| `link` | `[vendors...]` | `--dry-run` | Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT |
| `market detect-trap` | `<topic>` | `--force` | Preflight check that refuses keyword-trap queries |
| `market resolve` | — | `--refresh`, `--offline`, `--json`, `--output <format>` | Report the last30days engine oma will run (managed latest, pin, or local copy) and the Python it uses |
| `market run` | `[args...]` | — | Run the last30days engine (scripts/last30days.py) with the given arguments; --save-dir defaults to market.save_dir |
| `market update` | — | `--json`, `--output <format>` | Download the latest last30days release into oma's managed cache (~/.cache/oma-market/last30days) |
| `memory daemon restart` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Restart the OMA-owned AgentMemory daemon |
| `memory daemon start` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Start AgentMemory in the background |
| `memory daemon status` | — | `--json`, `--output <format>` | Show daemon status |
| `memory daemon stop` | — | `--dry-run`, `--json`, `--output <format>` | Stop the OMA-owned AgentMemory daemon |
| `memory gc` | — | `--scope <scope>` (default: `all`), `--keep <count>`, `--max-age <duration>`, `--dry-run`, `--json`, `--output <format>` | Garbage-collect project-local memory: prune old L1 sessions and ephemeral Serena files |
| `memory import` | — | `--source <source>` (default: `all`), `--since <since>` (default: `30d`), `--dry-run`, `--force-partial`, `--json`, `--output <format>` | Import vendor conversation history into AgentMemory |
| `memory init` | — | `--force`, `--json`, `--output <format>` | Initialize the coordination store in .agents/state/memories |
| `memory keys` | — | `--kind <kind>` (default: `connection`), `--profile <name>` (default: `oma`), `--key-env <name>` (default: `LLM_OPENAI_API_KEY`), `--from-env <name>`, `--dry-run`, `--json`, `--output <format>` | Configure Honcho connection or local embedding credentials |
| `memory maintain` | `<action>` | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain backup` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain prune` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain vacuum` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory retry drain` | — | `--dry-run`, `--json`, `--output <format>` | Drain queued semantic-memory deliveries |
| `memory service install` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Install AgentMemory launchd/systemd service integration |
| `memory service uninstall` | — | `--dry-run`, `--json`, `--output <format>` | Uninstall AgentMemory launchd/systemd service integration |
| `memory setup` | — | `--endpoint <url>`, `--port <port>`, `--install`, `--start`, `--dry-run`, `--json`, `--output <format>` | Prepare AgentMemory endpoint configuration |
| `memory status` | — | `--json`, `--output <format>` | Show selected semantic-memory provider health |
| `memory upgrade` | — | `--port <port>`, `--dry-run`, `--json`, `--output <format>` | Stop, backup, upgrade, restart, and health-check AgentMemory |
| `model check` | — | `--json`, `--fail-on-drift`, `--owner <name>`, `--probe` | Check model registry against live vendor model lists |
| `model probe` | `<slug>` | `--json`, `--timeout <duration>` | Probe a model slug against its vendor CLI to verify it is accepted |
| `model propose` | — | `--json`, `--owner <name>`, `--write`, `--timeout <duration>` | Run model:check --probe internally and generate an oma-config `models:` patch for accepted candidates |
| `profile create` | `<slot>` | `--json`, `--output <format>` | Create a local profile |
| `profile list` | — | `--json`, `--output <format>` | List local profiles |
| `profile run` | `<slot> <command> [args...]` | — | Run one command with OMA_PROFILE set for the child process |
| `profile show` | `[slot]` | `--json`, `--output <format>` | Show a local profile |
| `profile use` | `<slot>` | `--shell <shell>`, `--json`, `--output <format>` | Print shell code to activate an existing profile |
| `ralph verify` | — | `--session-id <id>`, `--newer-than <iso>`, `--no-emit`, `--json`, `--output <format>` | Verify ralph EXEC artifacts (anti-circumvention gate, ralph.md Step 1.3) |
| `recap` | — | `--window <period>` (default: `1d`), `--date <date>`, `--tool <tools>`, `--top <n>`, `--sort <metric>` (default: `count`), `--mermaid`, `--graph`, `--json`, `--output <format>` | Recap AI tool conversation history |
| `retro` | `[window]` | `--interactive`, `--compare`, `--json`, `--output <format>` | Engineering retrospective with metrics & trends |
| `schedule builtin-evolution-add` | `<workspace>` | `--cron <expr>` | — |
| `schedule create` | `<agent-id> <prompt>` | `--cron <expr>`, `--every <phrase>`, `--vendor <vendor>`, `-w, --workspace <path>`, `--once`, `--expires-after <duration>`, `--env <keys>`, `--dry-run`, `--accept-rounded` | Register a scheduled agent job |
| `schedule delete` | `<id>` | — | Remove a scheduled job from manifest and OS scheduler |
| `schedule inspect` | `<id>` | — | Inspect one scheduler manifest entry for internal callers |
| `schedule list` | — | `--json`, `--output <format>` | List scheduled jobs with OS drift state (synced/stale/missing-in-os/orphan-in-os), grouped by project |
| `schedule run` | `<id>` | `--oma-home <path>`, `--oma-state-home <path>`, `--registration <identity>` | Execute a scheduled job by id (invoked by OS scheduler; not normally called directly) |
| `schedule sync` | — | `--prune` | Re-sync manifest → OS scheduler (registers missing jobs, rewrites stale commands). Use --prune to remove orphan OS jobs. |
| `scholar get` | `<id>` | `--section <name>` | Fetch a sidecar (knows record_id) or work metadata (W-id, DOI, arXiv:&lt;id&gt;, CorpusId:&lt;n&gt;, S2 paperId) |
| `scholar lint` | `<file>` | `--lenient`, `--fail-on-warning` | Validate a .knows.yaml or .knows.json sidecar (v0.9.0) |
| `scholar resolve` | `<query...>` | — | Find best paper match across knows.academy, OpenAlex, Semantic Scholar |
| `scholar search` | `<query...>` | `--limit <n>` (default: `10`), `--year-min <year>`, `--always-fallback` | Search papers (knows.academy → OpenAlex → Semantic Scholar) |
| `search api fetch` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch via matched platform API (Phase 0) |
| `search api search` | `<query>` | `--platforms <list>`, `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fan-out keyword search across platforms that support it |
| `search archive` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch via AMP / archive.today / Wayback |
| `search code` | `<query>` | `--host <github\|gitlab>` (default: `github`), `--language <lang>`, `--repo <owner/repo>`, `--limit <n>` (default: `20`), `--pretty` | Search code via gh / glab |
| `search doctor` | — | — | Check dependencies (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search fetch` | `<url>` | `--only <strategies>`, `--skip <strategies>`, `--include-archive`, `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch URL via auto-escalating strategy pipeline |
| `search media` | `<url>` | `--subs`, `--sub-lang <list>` (default: `en`), `--format <spec>`, `--timeout <duration>` (default: `30s`), `--pretty` | Extract media metadata via yt-dlp (1858 sites) |
| `search meta` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Extract OGP / JSON-LD / Schema.org from URL |
| `search providers` | — | `--json`, `--pretty` | List registered search providers and inspect selection without network calls |
| `search rss fetch` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Discover and parse RSS/Atom feed for a URL |
| `search rss google` | `<query>` | `--locale <value>` (default: `en-US`) | Build Google News RSS URL for a query |
| `search trust` | `<domain>` | `--pretty` | Resolve trust level / score for a domain |
| `search web` | `<query>` | `--provider <id>`, `--limit <n>` (default: `10`), `--timeout <duration>` (default: `15s`), `--json`, `--pretty` | Search with the selected web provider (Brave has a CLI adapter) |
| `serena check` | — | `--project <path>` (default: `apps/mobile`), `--dart-sdk <path>`, `--timeout <duration>` (default: `60s`), `--staged` | Analyze a Dart package using the managed shared Serena LSP |
| `serena daemon gc` | — | `--quiet` | Stop shared Serena daemons with no clients after the idle grace period |
| `serena reap` | — | `--dry-run`, `--quiet` | Kill idle Serena LSP children to reclaim memory (Serena self-heals on next tool call) |
| `serena reaper disable` | — | `--dry-run` | Uninstall the periodic Serena Reaper scheduled task |
| `serena reaper enable` | — | `--dry-run` | Install the periodic Serena Reaper scheduled task (runs every 5 minutes) |
| `serena setup` | — | — | Repair the managed adapter and install the oma-dart-check compatibility launcher |
| `skill audit` | — | `--json`, `--output <format>` | Check frontmatter description similarity between installed skills |
| `skill eval` | — | `--skill <id>`, `--mock`, `--live`, `--record`, `--yes`, `--task-dir <path>`, `--max-tasks <n>`, `--trials <n>`, `--require-coverage`, `--neg-transfer`, `--routing`, `--json`, `--output <format>` | Measure per-skill utility lift (treatment vs baseline on held-out tasks) |
| `skill evolution-stats` | — | `--skill <id>`, `--json`, `--output <format>` | Aggregate recorded optimization runs: proposals, acceptance, verified improvements, rollbacks, by memory mode and procedure |
| `skill lint` | — | `--skill <id>`, `--json`, `--output <format>` | Detect per-skill authoring smells (frontmatter, structure, broken refs) |
| `skill meta-optimize` | — | `--target <part>` (default: `optimizer`), `--skill <ids...>`, `--anchor <ids...>`, `--repeats <n>` (default: `3`), `--candidates <n>` (default: `2`), `--max-epochs <n>` (default: `1`), `--edits-per-epoch <k>` (default: `4`), `--live`, `--apply`, `--memory <mode>` (default: `none`), `--yes`, `--json`, `--output <format>` | Propose and score changes to the evolution procedure itself on held-out skills; promote only with a paired bootstrap interval above zero |
| `skill optimize` | — | `--skill <id>`, `--dry-run`, `--apply`, `--mock`, `--live`, `--max-epochs <n>` (default: `8`), `--edits-per-epoch <k>` (default: `4`), `--lr <chars>` (default: `600`), `--yes`, `--memory <mode>` (default: `recall`), `--json`, `--output <format>` | Optimize a skill's SKILL.md to maximize measured held-out utility lift |
| `skill procedure` | — | `--export`, `--json`, `--output <format>` | Show the evolution procedure (optimizer/maintainer prompts, constitution) and its hashes; --export writes editable defaults |
| `skill promotions` | — | `--skill <id>`, `--all`, `--json`, `--output <format>` | List recorded SKILL.md promotions and rollbacks for a skill, or every skill and the procedure with --all |
| `skill rollback` | — | `--skill <id>`, `--json`, `--output <format>` | Restore the SKILL.md body replaced by the most recent recorded promotion |
| `skills matrix` | — | `--suite <path>`, `--project-root <path>`, `--skills <names>`, `--delivery <mode>` (default: `native`), `--vendors <ids>` (default: `claude,codex`), `--cases <ids>`, `--live`, `--yes`, `--timeout-seconds <n>` (default: `120`), `--claude-model <model>`, `--codex-model <model>`, `--report <path>`, `--json`, `--output <format>` | Test native skill discovery, references and output contracts across CLI vendors |
| `slide asset fetch-video` | `<url>` | `--workspace <path>`, `--output-name <name>` | Download video via yt-dlp into ./assets/ and print local ref |
| `slide bundle` | — | `--workspace <path>`, `--output-file <path>`, `--inline-fonts` | Merge per-slide files into a single self-contained .html deliverable |
| `slide create` | — | `--output-dir <path>` (default: `my-deck`), `--force` | Scaffold a new slide working directory with starter HTML, assets/, and meta.json |
| `slide doctor` | — | — | Probe required deps (chrome, puppeteer-core) and optional deps (yt-dlp, pptxgenjs) |
| `slide edit` | — | `--workspace <path>`, `--port <n>` (default: `0`) | Open browser bbox editor (node:http server at 127.0.0.1, dispatches to oma agent runner) |
| `slide export pdf` | — | `--workspace <path>`, `--output-file <path>`, `--mode <mode>` (default: `capture`) | Export slides to PDF via puppeteer-core |
| `slide export png` | — | `--workspace <path>`, `--output-dir <path>`, `--resolution <res>` (default: `1080p`) | Export each slide as a PNG image via puppeteer-core |
| `slide export pptx` | — | `--workspace <path>`, `--output-file <path>` | [EXPERIMENTAL] Export to PPTX via pptxgenjs (raster-backed, gradients rasterized) |
| `slide import pptx` | `<file>` | `--workspace <path>` | Import a .pptx file into slide fragments via officeparser (bunx, best-effort) |
| `slide preview` | — | `--workspace <path>` | Build viewer.html (deck-stage web component + speaker-notes panel, toggle with `n`) |
| `slide style get` | `<slug>` | `--refresh` | Fetch a bold template design.md (always-latest main; cached for offline fallback) |
| `slide style list` | — | — | List available style presets (vendored + bold-template index) |
| `slide style preview` | `<slug>` | — | Preview a style preset in the terminal |
| `slide validate` | — | `--workspace <path>`, `--output <format>` (default: `concise`), `--slide <file>`, `--report-file <path>` | Geometric quality gate — renders slides via puppeteer-core and checks overflow/overlap/font-size |
| `star` | — | — | Star oh-my-agent on GitHub |
| `state activate` | `<session-id>` | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90ds`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state archive` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90ds`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state decisions list` | `[workflow]` | `--agent <id>`, `--json`, `--output <format>` | List workflow checkpoints or available agent decision subjects |
| `state emit` | `<kind> [payload]` | `--session-id <id>`, `--category <category>` (default: `main`), `--vendor <vendor>`, `--vendor-sid <vendorSid>`, `--parent-event-id <eventId>`, `--causality-key <key>`, `--ts <iso>`, `--no-mirror`, `--json`, `--output <format>` | Append an OMA L1 workflow event |
| `state get` | `<sid>` | `--json`, `--output <format>` | Inspect one OMA L1 session by ID |
| `state heal-check` | — | `--agent <agentType>`, `--json`, `--output <format>` | Check whether self-healing is allowed for an agent |
| `state inject-log get` | `<session-id> <file>` | `--json`, `--output <format>` | List or view per-boundary inject audit logs (D52) |
| `state inject-log list` | `<sid>` | `--entry <file>`, `--json`, `--output <format>` | List or view per-boundary inject audit logs (D52) |
| `state list` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90ds`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state migrate` | — | `--runtime`, `--include-active`, `--dry-run`, `--json`, `--output <format>` | Migrate project state to the home profile |
| `state purge` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90ds`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state repair` | — | `--dry-run`, `--json`, `--output <format>` | Repair OMA L1 workflow state files |
| `state summary` | `[sid]` | `--category <category>` (default: `main`), `--json`, `--output <format>` | Export a session summary to the coordination store |
| `state trajectory` | `[sid]` | `--category <category>` (default: `main`), `--open`, `--width <columns>`, `--sequence`, `--ascii`, `--json`, `--output <format>` | Show a session trajectory: L1 events joined with vendor transcripts |
| `state verify` | — | `--workflow <workflow>`, `--checkpoint <checkpoint>`, `--instance <id>`, `--session-id <id>`, `--category <category>` (default: `main`), `--no-emit-missing`, `--json`, `--output <format>` | Verify required L1 events for a workflow checkpoint |
| `stats get` | — | `--json`, `--output <format>` | View productivity metrics |
| `stats reset` | — | `--json`, `--output <format>` | View productivity metrics |
| `uninstall` | — | `--dry-run`, `-y, --yes` | Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills) |
| `update` | — | `-f, --force`, `--with-new-skills`, `--ci`, `-y, --yes`, `--all`, `--vendor <vendors>` | Update skills to latest version from registry |
| `update mcp` | — | `-y, --yes`, `--ci`, `--all`, `--vendor <vendors>` | Choose browser MCP servers (Aside, Chrome DevTools, Firefox DevTools) |
| `vault delete` | `<name>` | — | Remove a secret from the keychain and the index |
| `vault get` | `<name>` | — | Print stored value to stdout (for: export KEY=$(oma vault get &lt;name&gt;)) |
| `vault list` | — | `--json` | List stored secret names (values never displayed) |
| `vault store` | `<name>` | `--value <value>` | Store a secret under &lt;name&gt; (interactive password prompt) |
| `verify agent` | `<agent-type>` | `-w, --workspace <path>` (default: current directory), `--session-id <id>`, `--task-id <id>`, `--run-id <id>`, `--json`, `--output <format>` | — |
| `verify triggers` | — | `--corpus <path>`, `--max-false-fire <pct>`, `--max-missed-fire <pct>`, `--json`, `--output <format>` | Measure keyword-detector trigger accuracy against a labeled prompt corpus |
| `version` | — | — | Show version number |
| `video compose` | `<runDir>` | `--output <format>` (default: `text`), `--refresh`, `--offline` | Scaffold the run's Hyperframes project on the latest toolchain + heygen-com/hyperframes; prints the authoring contract |
| `video doctor` | — | `--output <format>` (default: `text`), `--install`, `--upgrade`, `--install-mpt`, `--install-strudel` | Check video provider and compositor readiness |
| `video generate` | `<brief...>` | `--mode <mode>`, `--aspect <aspect>`, `--locale <lang>`, `--captions <style>`, `--visual <mode>`, `--voice <profile>`, `--music <mode>`, `--duration <sec>`, `--compositor <name>`, `--capture <path>`, `--source <kind>` (default: `file`), `--url <url>`, `--device <name>`, `--ready-selector <css>`, `--show-cursor`, `--polish`, `--capture-timeout <sec>`, `--capture-stop <mode>`, `--output-dir <path>`, `--allow-external-output`, `--max-usd <n>`, `--seed <n>`, `--timeout <duration>`, `-y, --yes`, `--dry-run`, `--script <path>`, `--output <format>` (default: `text`), `--no-brief-in-manifest` | Generate a video run directory from a brief |
| `video provider list` | — | `--output <format>` (default: `text`) | List video providers and availability |
| `video render` | `<runDir>` | `--output <format>` (default: `text`) | Re-render a run directory from render-spec.json |
| `visualize` | — | `--focus <node-or-path>`, `--affected <paths...>`, `--json`, `--output <format>` | Visualize project structure as a dependency graph |

<!-- oma:generated cli-registry:end -->

---

## Voir aussi {#see-also}

- [Commandes CLI](./commands.md) : comportement et exemples par commande.
- Les fichiers de règles des fournisseurs (`.cursor/rules`, ...) sont régénérés par [`oma link <vendor>`](./commands.md#link), et non par une commande `export` distincte.
- [Référence de configuration](../guide/configuration-reference.md) : les clés de configuration que ces indicateurs remplacent.
- [Mises à jour automatisées](../guide/automated-updates.md) : exécuter `oma update` depuis la GitHub Action.
- [Surveillance par tableau de bord](../guide/dashboard-monitoring.md) : `agent status` et les tableaux de bord.
- [Installation globale](../guide/global-install.md) : racines d’installation du projet et globale.
- [Dépannage](../guide/troubleshooting.md)
