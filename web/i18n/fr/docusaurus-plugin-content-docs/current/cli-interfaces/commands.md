---
title: "Commandes CLI"
description: "Référence complète de chaque commande CLI oh-my-agent, avec syntaxe, options et exemples organisés par catégorie."
---

# Commandes CLI

Après une installation globale (`bun install --global oh-my-agent`), utilisez `oma` ou `oh-my-agent`. Pour une utilisation ponctuelle sans installation, lancez `npx oh-my-agent`.

La variable d’environnement `OH_MY_AG_OUTPUT_FORMAT` peut être définie à `json` pour forcer une sortie lisible par machine sur les commandes qui la prennent en charge. Cela revient à passer `--json` à chaque commande concernée.

## Commencer par une tâche

Choisissez la plus petite commande qui répond à votre question. Chaque commande ci-dessous affiche un chemin ou un rapport que vous pouvez examiner avant de passer à l’étape suivante.

| Tâche | Commencez ici | Résultat attendu |
|:-----|:-----------|:----------------|
| Installer ou réparer un projet | `oma install` puis `oma doctor` | Ressources installées et rapport d’état ; utilisez `oma doctor --profile` si le sujet est la résolution du modèle. |
| Trouver une commande ou une option depuis un agent | `oma describe` ou `oma describe "image generate"` | JSON décrivant les arguments, options et commandes imbriquées. |
| Générer une image | `oma image generate "<prompt>" --output json` | Chemins des images et manifeste dans `.agents/results/images/`. |
| Préparer ou produire une vidéo | `oma video generate "<brief>" --dry-run` | Répertoire d’exécution contenant les artefacts de planification ; ne composez et ne produisez qu’après avoir écrit la composition. |
| Créer un explicateur de code interactif | `/explain` | Artefact HTML autonome validé sous `.agents/results/explain/`. |
| Résoudre un moteur de diagrammes | `oma diagram resolve --output json` | Moteur Mermaid ou archify sélectionné et justification. |
| Rechercher des signaux communautaires | `oma market detect-trap "<topic>"` | Résultat de précontrôle ; poursuivez avec `oma market resolve --output json` et l’exécution amont uniquement si le contrôle réussit. |
| Convertir ou inspecter un article | `oma scholar search "<query>"` | Résultats de recherche issus de Knows, OpenAlex ou Semantic Scholar ; récupérez un sidecar avec `oma scholar get`. |
| Créer une présentation | `oma slide create --output-dir <dir>` | Répertoire de travail pouvant être écrit, validé, regroupé et exporté. |
| Examiner la dérive documentaire | `oma docs verify --json` | Rapport structuré des références rompues et index de références régénéré. |

Le registre présent dans le dépôt est la source de cette carte des commandes. Les noms canoniques de découverte ci-dessous proviennent de `oma describe` ; l’aide interactive peut afficher des alias de compatibilité comme `slide new`, `slide viewer`, `image list-vendors` ou `video list-providers`.

## Surface actuelle des commandes

Cette carte permet de parcourir plus facilement les références détaillées ci-dessous et de découvrir les familles moins courantes. Utilisez `--help` de chaque famille ou `oma describe <path>` pour connaître la grammaire exacte des arguments ; [Options CLI](./options.md) contient la matrice complète des options du registre.

| Famille | Chemins enregistrés |
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update`, `update mcp` |
| `link` | `link` |
| `intel` | `intel`, `intel suggest` |
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run` |
| `doctor` | `doctor` |
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify`, `verify agent`, `verify triggers` |
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google` |
| `harness` | `harness`, `harness eval`, `harness incident`, `harness feedback`, `harness evolution enable`, `harness evolution status`, `harness evolution disable`, `harness evolution run` |
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get` |
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint` |
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list` |
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list` |
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable` |
| `explain` | `explain`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state trajectory`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`, `skill meta-optimize`, `skill procedure`, `skill evolution-stats`, `skill promotions`, `skill rollback` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Lorsqu’une commande délègue ses arguments restants à un autre outil, le registre laisse volontairement ses options ouvertes. Cela concerne `market run` et `diagram archify` ; consultez l’aide amont résolue avant d’exécuter une opération qui modifie des données ou utilise le réseau.

---

## Configuration et installation

### install

`oma` sans argument lance l’installateur interactif. `oma install` est la forme explicite et accepte des options de sélection des fournisseurs.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence` et `--semantic-memory` conservent le choix de fournisseur enregistré lorsqu’ils sont omis. `--honcho-url` et `--honcho-workspace` configurent une nouvelle connexion Honcho lorsque ce fournisseur est sélectionné. L’option racine `-y, --yes` ignore les invites et utilise les valeurs par défaut ; `--global` cible l’installation HOME.

**Ce que fait la commande :**
1. Recherche un ancien répertoire `.agent/` et le migre vers `.agents/` s’il existe.
2. Détecte les outils concurrents et propose de les supprimer.
3. Demande le type de projet (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Si le backend est sélectionné, demande la variante de langage (Python, Node.js, Rust, Other).
5. Demande si des liens symboliques GitHub Copilot sont souhaités.
6. Télécharge la dernière archive depuis le registre.
7. Installe les ressources partagées, workflows, configurations et compétences sélectionnées.
8. Installe les adaptations de fournisseur pour les fournisseurs sélectionnés (paramètres locaux au projet ; aucune écriture silencieuse au niveau HOME).
9. Crée les liens symboliques CLI.
10. Propose une configuration git **globale** recommandée (confirmation facultative) :
    - `rerere.enabled=true` — réutilisation des conflits de fusion multi-agents
    - `init.defaultBranch=main` — branche par défaut cohérente pour les nouveaux dépôts
    - Entièrement ignorée avec `--yes` / CI (des indications de correction manuelle sont affichées à la place)
11. Propose de configurer MCP lorsque cela s’applique.
12. Demande une étoile GitHub si `gh` est authentifié.

**Exemple :**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Contrôle de santé des installations CLI, des configurations MCP et de l’état des compétences.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche la sortie au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--profile` | Affiche la matrice de santé des profils. Elle indique le slug de modèle résolu, le CLI et l’état d’authentification de chaque agent selon le `model_preset` actif et les surcharges `agents:`. Voir [Modèles par agent](../guide/per-agent-models.md). |

**Contrôles effectués :**
- Installations CLI : agy, claude, codex, qwen (version et chemin).
- État d’authentification de chaque CLI.
- Configuration MCP : `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Compétences installées : compétences présentes et état de chacune.
- Répertoire du magasin de mémoire : existence de `.agents/state/memories/` et nombre de fichiers (les projets plus anciens utilisent en repli le chemin historique `.serena/memories/`).
- Marqueurs de double installation (projet et globale) et avertissements associés.
- Configuration git **globale** recommandée (`gitRecommended` dans le JSON) :
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Chaque divergence est comptée dans `totalIssues`
- Fichier de contexte des fournisseurs du projet (bloc OMA de `AGENTS.md` lorsque Codex, Qwen ou Claude Code ≥ 2.1.277 est installé).
- AgentMemory, état/santé des hooks, diagnostics du reaper Serena et compteurs d’incidents associés.

**Réparation automatique :** si des compétences manquantes sont détectées, `doctor` propose de les installer de manière interactive. Si la configuration git recommandée est absente ou incorrecte, il propose les mêmes corrections globales facultatives que install/update.

**Exemples :**
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update

Met à jour les compétences vers la dernière version du registre.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `-f, --force` | Écrase les fichiers de configuration personnalisés (`oma-config.yaml`, `mcp.json`, répertoires `stack/`) |
| `--with-new-skills` | Installe les compétences ajoutées dans cette version ; sans cette option, seules les compétences déjà installées sont actualisées. |
| `--ci` | Exécute en mode CI non interactif (ignore les invites, sortie en texte simple) |
| `-y, --yes` | Ignore les invites. La portée des fournisseurs reste inchangée : seuls les répertoires existants sont mis à jour, sauf avec `--all` ou `--vendor`. |
| `--all` | Crée ou met à jour tous les fournisseurs pris en charge au niveau du projet. |
| `--vendor <vendors>` | Crée ou met à jour des fournisseurs précis. Accepte une liste séparée par des virgules, comme `claude,qwen`. |

**Ce que fait la commande :**
1. Récupère `prompt-manifest.json` depuis le registre pour vérifier la dernière version.
2. Compare avec la version locale dans `.agents/skills/_version.json`.
3. Quitte si la version est déjà à jour.
4. Télécharge et extrait la dernière archive.
5. Préserve les fichiers personnalisés par l’utilisateur (sauf avec `--force`).
6. Copie les nouveaux fichiers dans `.agents/`.
7. Restaure les fichiers préservés.
8. Met à jour les adaptations de fournisseurs et actualise les liens symboliques. Par défaut, seuls les répertoires de fournisseurs déjà présents dans le projet sont touchés.
9. Propose la configuration git **globale** recommandée (comme lors de l’installation : `rerere.enabled`, `init.defaultBranch`). Elle est ignorée avec `--yes` / `--ci`.

**Exemples :**
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen

# Also refresh browser MCP selections
oma update mcp --ci
```

`oma update mcp` possède ses propres options `--yes`, `--ci`, `--all` et `--vendor <vendors>`. Elle sélectionne les serveurs MCP de navigateur pris en charge (Aside, Chrome DevTools ou Firefox DevTools) pour les fournisseurs sélectionnés au niveau du projet.

### uninstall

Prévisualise ou supprime les fichiers appartenant à OMA depuis la racine d’installation sélectionnée :

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` liste les suppressions sans modifier les fichiers. `--yes` ignore l’invite de confirmation. La commande préserve `oma-config.yaml`, `mcp.json` et les compétences écrites par l’utilisateur selon la description enregistrée de la commande. Si la prévisualisation inclut un fichier dont vous avez encore besoin, arrêtez-vous et conservez la sortie dry-run pour examen.

### link

Régénère les fichiers natifs des fournisseurs à partir de la source de vérité `.agents/` sans réinstaller.

```
oma link [vendors...] [--global]
```

**Exemples :**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Sans `--global`, link cible `<cwd>/.agents/` ; avec cette option, il cible `~/.agents/` (ou `OMA_HOME`). Voir [Installation globale](../guide/global-install.md).

**Ce que fait la commande :**
1. Reconstruit les fichiers d’agents natifs des fournisseurs depuis `.agents/agents/`.
2. Actualise les hooks et les paramètres locaux des fournisseurs sélectionnés.
3. Régénère le bloc d’intégration `AGENTS.md` pour chaque fournisseur configuré, Claude Code compris. `CLAUDE.md` et `GEMINI.md` ne sont jamais créés ni dotés d’un bloc OMA. Claude Code ≥ 2.1.277 lit `AGENTS.md` nativement, mais l’ignore dès lors qu’un `CLAUDE.md` existe ; lorsqu’un `CLAUDE.md` appartenant à l’utilisateur est présent, link ajoute donc une seule ligne d’import `@AGENTS.md` ; `oma update` supprime aussi l’ancien bloc OMA de `CLAUDE.md` dès que cette version est détectée.
4. Actualise la liaison MCP de Cursor et les liens symboliques des compétences CLI lorsque c’est pertinent.

Utilisez cette commande après avoir modifié `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` ou les définitions de hooks.

**Comportement des modèles :**
- La délégation native vers le même fournisseur utilise le modèle défini dans le fichier d’agent généré pour ce fournisseur.
- La délégation de repli externe utilise le `default_model` de chaque fournisseur dans `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Comportement de la délégation :**
- Si le fournisseur cible correspond à l’environnement d’exécution actuel et que cet environnement prend en charge les agents natifs par rôle, OMA utilise la délégation native.
- Sinon, OMA revient à `oma agent spawn`.

### setup (workflow)

Le workflow `/setup` (invoqué dans une session d’agent) permet de configurer interactivement le langage, les installations CLI, les connexions MCP et la correspondance agent-CLI. Il diffère de `oma` (l’installateur) : `/setup` configure une instance déjà installée.

---

## Surveillance et métriques

### dashboard

Démarre le tableau de bord terminal pour surveiller les agents en temps réel.

```
oma dashboard terminal
```

Aucune option. Surveille `.agents/state/memories/` dans le répertoire courant (les projets plus anciens utilisent en repli `.serena/memories/`). L’interface en caractères de boîte affiche l’état des sessions, le tableau des agents et le flux d’activité. Elle se met à jour à chaque modification de fichier. Appuyez sur `Ctrl+C` pour quitter.

Le répertoire de mémoires peut être remplacé par la variable d’environnement `MEMORIES_DIR`.

**Exemple :**
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web

Démarre le tableau de bord web.

```
oma dashboard web
```

Démarre un serveur HTTP à l’adresse `http://localhost:9847` avec une connexion WebSocket pour les mises à jour en direct. Ouvrez cette URL dans un navigateur pour afficher le tableau de bord.

**Variables d’environnement :**

| Variable | Valeur par défaut | Description |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Port du serveur HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Chemin du répertoire de mémoires (revient à `{cwd}/.serena/memories` pour les projets plus anciens) |

**Exemple :**
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Affiche les métriques de productivité.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Métriques suivies :**
- Nombre de sessions
- Compétences utilisées (avec fréquence)
- Tâches terminées
- Durée totale des sessions
- Fichiers modifiés, lignes ajoutées, lignes supprimées
- Horodatage de la dernière mise à jour

**Télémétrie des coûts** (agrégée sur chaque fichier `session-cost-*.md` sous `.agents/state/memories/`) :
- Nombre total de tokens d’entrée (approximation fondée sur les caractères du prompt, sans tokens de sortie pour l’instant)
- Nombre total de délégations
- Estimation en USD selon une table prudente de tarifs par token d’entrée et fournisseur (Claude 3 $/M, Codex 5 $/M, Gemini 0,3 $/M, Qwen 0 $/M, Cursor 5 $/M, Antigravity 0,3 $/M)
- Répartition par fournisseur (tokens · délégations · USD)

L’estimation est un plancher, pas un montant fidèle à la facturation. Configurez `session.quota_cap` dans `.agents/oma-config.yaml` pour imposer des budgets stricts au lancement ; consultez la page Pourquoi oh-my-agent dans les guides de démarrage pour l’arsenal axé sur la qualité auquel ces plafonds appartiennent.

Les métriques sont stockées dans `.agents/state/metrics.json` ; `.serena/metrics.json` est lu lorsqu’il existe. Les données sont collectées à partir des statistiques git et des fichiers de mémoire.

**Exemples :**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Récapitule l’historique des conversations des outils IA à travers les sessions Claude, Codex, Qwen et Cursor.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Options :**

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--window <period>` | Période : `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Date précise (`YYYY-MM-DD`) ; prioritaire sur `--window` | |
| `--tool <tools>` | Filtre séparé par des virgules : `grok,claude,codex,qwen,cursor,antigravity` | tous |
| `--top <n>` | Affiche les N premiers projets/sujets | |
| `--sort <metric>` | Trie selon `count` ou `duration` | `count` |
| `--mermaid` | Affiche un diagramme de Gantt Mermaid | |
| `--graph` | Ouvre un graphe interactif dans le navigateur | |
| `--json` / `--output <format>` | Sortie lisible par machine | `text` |

**Exemples :**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro

Rétrospective d’ingénierie avec métriques et tendances.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Arguments :**

| Argument | Description | Valeur par défaut |
|:---------|:-----------|:--------|
| `window` | Période d’analyse (par exemple `7d`, `2w`, `1m`) | 7 derniers jours |

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--interactive` | Mode interactif avec saisie manuelle |
| `--compare` | Compare la période actuelle avec la période précédente de même durée |

**Contenu affiché :**
- Résumé publiable (métriques sur une ligne)
- Tableau récapitulatif (commits, fichiers modifiés, lignes ajoutées/supprimées, contributeurs)
- Tendances par rapport à la dernière rétrospective (si un instantané précédent existe)
- Classement des contributeurs
- Répartition horaire des commits (histogramme)
- Sessions de travail
- Répartition des types de commits (feat, fix, chore, etc.)
- Zones sensibles (fichiers les plus modifiés)

**Exemples :**
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## Sessions et profils locaux

### state list

Répertorie les sessions de workflow OMA du projet courant. La découverte globale explicite répertorie les sessions de tous les projets dans le profil local sélectionné :

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` est en lecture seule. Il ne peut pas être combiné avec l’activation ou la maintenance d’une session. Les lectures et écritures de sessions normales restent limitées au projet. Les sessions historiques d’autres dépôts doivent d’abord être migrées vers le stockage HOME avant d’apparaître dans la liste agrégée.

### profile

Gère les profils de stockage locaux sous `~/.oma/u/<slot>/`. Les emplacements sont des entiers décimaux non négatifs ; ils sont distincts des préréglages de modèles et des comptes de connexion aux fournisseurs.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` affiche l’activation du shell ; son évaluation définit `OMA_PROFILE` dans le shell courant. Exécutée seule, elle ne modifie pas le shell parent, les applications déjà lancées ni un paramètre CLI distinct par défaut. Les commandes CLI et les hooks de fournisseurs lancés depuis le shell activé héritent du même profil. Le profil par défaut est `0` ; `OMA_STATE_HOME` remplace la racine de stockage.
`profile run <slot> -- <command> [args...]` sélectionne le profil uniquement pour cette commande et ses enfants. Le séparateur laisse les options enfants comme `--help` et `--json` attachées à la commande enfant.

---

## Gestion des agents

### agent spawn

Lance un processus d’agent secondaire.

```
oma agent spawn <agent-id> <prompt> <session-id> [--vendor <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `agent-id` | Oui | Type d’agent. L’un de : `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` |
| `prompt` | Oui | Description de la tâche. Peut être un texte inline ou un chemin de fichier. |
| `session-id` | Oui | Identifiant de session (format `session-YYYYMMDD-HHMMSS`) |

**Options :**

| Option | Description |
|:-----|:-----------|
| `--vendor <vendor>` | Surcharge du fournisseur CLI : `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Répertoire de travail de l’agent. Détecté automatiquement depuis la configuration du monorepo s’il est omis. |
| `--resumed-from <run-id>` | Relie une nouvelle tentative à l’ID de l’exécution précédente. |
| `--task-id <id>` | ID de tâche issu du plan de session. Par défaut, l’ID de l’agent. |
| `--isolation <mode>` | Mode d’isolation par lancement. Prend actuellement en charge `worktree` : crée un worktree git à `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` sur la branche `oma/{sessionId}/{agentId}` et y exécute l’agent. Le worktree est conservé après la fin ; les commandes de fusion ou de suppression sont affichées pour une revue manuelle (aucune fusion automatique). |
| `--read-only` | Limite l’agent lancé aux outils non destructifs et supprime les options d’auto-approbation. Utilisé en interne par `oma skill eval --live` pour les deux branches d’évaluation. |
| `--fallback-vendors <vendors>` | Active une chaîne ordonnée, séparée par des virgules, d’au plus trois fournisseurs CLI configurés. La continuation exige un échec reconnu lié au quota, à la limitation de débit ou à une panne transitoire, ainsi qu’un nouveau point de contrôle de transmission sûre. |

**Résolution du fournisseur :** l’option `--vendor` est prioritaire, suivie de la surcharge `agents:` dans `oma-config.yaml`, puis des valeurs par défaut du profil d’agents du `model_preset` actif.

**Résolution du prompt :** si l’argument du prompt est le chemin d’un fichier existant, son contenu est utilisé ; sinon l’argument est traité comme texte inline. Les protocoles d’exécution propres au fournisseur sont ajoutés automatiquement.

**Codes de sortie :**

| Code | Signification |
|:-----|:--------|
| `0` | Le processus du fournisseur s’est terminé avec le code 0 et un artefact de résultat de session existe dans l’espace de travail. |
| `3` | Le processus du fournisseur s’est terminé avec le code 0 mais n’a écrit aucun artefact de résultat dans l’espace de travail (par exemple agy écrit dans sa propre racine de confiance au lieu de `-w`). Un événement `blocker.raised` est ajouté à la trace de session et `agent status` affiche `no-artifact`. Le lancement ne doit pas être considéré comme terminé. |
| autre | Le processus du fournisseur lui-même a échoué ; son code de sortie est propagé. |

**Exemples :**
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

**Bascule entre fournisseurs :** les candidats de repli doivent avoir une entrée dans la configuration CLI installée. Chaque tentative utilise la configuration de modèle de son fournisseur cible et passe par les contrôles de quota de session existants. Le proxy multi-fournisseurs `pi` est exclu de cette première fonction de repli. Aucun nouvel identifiant de fournisseur ni route d’API payante n’est créé.

Lorsque le repli est activé, la tâche reçoit l’instruction de préparer un enregistrement de transmission sûr, propre à l’exécution, sous `.agents/results/`. Un successeur lit cet enregistrement et vérifie l’espace de travail avant de poursuivre le travail restant. Un quota épuisé sans point de contrôle exploitable s’arrête avec un enregistrement needs-review. Une annulation, un échec ordinaire ou une exécution terminée ne déclenche pas de nouvelle tentative. `--read-only` ne dispense pas de cette exigence de point de contrôle.

Les événements de session enregistrent la raison de la transition ainsi que les fournisseurs source et cible ; chaque tentative possède sa propre identité d’exécution et renvoie vers son prédécesseur. Cela s’applique aux sous-processus lancés par `oma agent spawn` ; la commande ne change pas automatiquement une conversation interactive existante dans une application fournisseur. Omettre `--fallback-vendors` conserve l’exécution habituelle avec un seul fournisseur.

### agent status

Vérifie l’état d’un ou plusieurs agents secondaires.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `session-id` | Oui | Identifiant de session à vérifier. |
| `agent-ids` | Non | Liste d’identifiants d’agents séparés par des espaces. Si elle est omise, aucune sortie n’est produite. |

**Options :**

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Chemin racine utilisé pour les contrôles de mémoire | Répertoire courant |

**Valeurs d’état :**
- `completed` : le fichier de résultat existe (avec un en-tête d’état facultatif).
- `running` : le fichier PID existe et le processus est actif.
- `crashed` : le fichier PID existe mais le processus est arrêté, ou aucun fichier PID/résultat n’a été trouvé.
- `no-artifact` : le processus fournisseur s’est terminé avec le code 0 mais n’a écrit aucun artefact de résultat dans l’espace de travail (écriture silencieusement redirigée — voir le code de sortie `3` de `agent spawn`). À traiter comme un lancement échoué.

**Format de sortie :** une ligne par agent : `{agent-id}:{status}`.

**Exemples :**
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel

Exécute plusieurs agents secondaires en parallèle.

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `tasks` | Oui | Soit le chemin d’un fichier de tâches YAML, soit des spécifications inline avec `--inline` |

**Options :**

| Option | Description |
|:-----|:-----------|
| `--vendor <vendor>` | Surcharge du fournisseur CLI pour tous les agents lancés. |
| `-i, --inline` | Mode inline : spécifie les tâches comme arguments `agent:task[:workspace]`. |
| `--no-wait` | Mode en arrière-plan (lance les agents et revient immédiatement). |

**Format du fichier de tâches YAML :**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Format des tâches inline :** `agent:task` ou `agent:task:workspace` (le workspace doit commencer par `./` ou `/`).

**Répertoire des résultats :** `.agents/results/parallel-{timestamp}/` contient les fichiers journaux de chaque agent.

**Exemples :**
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review

Effectue une revue de code avec un CLI IA externe (codex, claude, qwen ou grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--vendor <vendor>` | Fournisseur CLI : `codex`, `claude`, `qwen` ou `grok`. Par défaut, `codex` lorsque le fournisseur résolu n’est pas pris en charge. |
| `-p, --prompt <prompt>` | Prompt de revue personnalisé. Sans cette option, un prompt de revue par défaut est utilisé. |
| `-w, --workspace <path>` | Chemin à examiner. Par défaut, le répertoire courant. |
| `--no-uncommitted` | Ignore la revue des modifications non commitées. Avec cette option, seules les modifications commitées dans la session sont examinées. |

**Ce que fait la commande :**
- Détecte automatiquement l’identifiant de session courant depuis l’environnement ou l’activité git récente.
- Pour `codex`, utilise la sous-commande native `codex review`.
- Pour `claude` et `qwen`, construit un appel fondé sur un prompt et lance le CLI avec le prompt de revue.
- Par défaut, examine les modifications non commitées dans le répertoire de travail.
- Avec `--no-uncommitted`, limite la revue aux modifications commitées dans la session.

**Exemples :**
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### goal set {#goal-set}

Associe un contrat d’objectif à un workflow persistant actif (orchestrate, ultrawork, work, ralph). Le contrat est appliqué mécaniquement par le hook Stop du mode persistant : la fin ne dépend plus du seul jugement du modèle.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--gate <keyword>` | Garde d’arrêt déterministe : `typecheck`, `test` ou `lint`. Se mappe vers le script de même nom dans package.json, exécuté comme tableau argv sans shell. Tant qu’elle est définie, le hook Stop n’autorise la fin du workflow que si ce script réussit ; en cas d’échec, il bloque avec la fin de la sortie pour permettre la correction. Les commandes libres sont refusées — la valeur de la garde réside dans un fichier d’état modifiable par l’agent, et exécuter des chaînes arbitraires depuis ce fichier contournerait la couche d’autorisation. |
| `--budget-minutes <n>` | Budget en temps réel mesuré depuis l’activation du workflow. Une fois dépassé, le hook Stop désactive le workflow et autorise un arrêt honnête et partiel (verdict machine enregistré comme `gate.failed` avec `gate: "budget"` dans la trace des événements de session). |
| `--description <text>` | Description humaine de l’objectif. Informatif uniquement. |
| `--workflow <name>` | Workflow ciblé lorsqu’il y en a plusieurs persistants. |
| `--session <id>` | Suffixe d’identifiant de session du fichier d’état. |

**Notes de comportement :**
- Garde réussie → le workflow est désactivé, `gate.passed` est émis et l’arrêt est autorisé.
- Échec de la garde et dépassement du délai (plafond strict de 60 s) comptent tous deux dans la limite de renforcement (5) ; une garde durablement en échec ne peut donc pas bloquer les arrêts indéfiniment. L’expiration de péremption à 2 heures reste le dernier filet de sécurité.
- Sans contrat d’objectif, le mode persistant se comporte exactement comme auparavant (seuls les prompts de renforcement s’appliquent) : le contrat est entièrement facultatif.

**Exemples :**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Agents planifiés

### schedule create

Enregistre une tâche d’agent planifiée. Une seule des options `--cron` et `--every` est obligatoire.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `agent-id` | Oui | Type d’agent : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Oui | Description de la tâche transmise à l’agent au moment du déclenchement |

**Options :**

| Option | Description |
|:-----|:-----------|
| `--cron "<expr>"` | Expression cron à 5 champs (par exemple `"0 9 * * *"`). Mutuellement exclusive avec `--every`. |
| `--every "<phrase>"` | Intervalle en langage naturel : `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Arrondi à l’étape exprimable par cron la plus proche, avec affichage d’une note. Mutuellement exclusive avec `--cron`. |
| `--vendor <vendor>` | Surcharge du fournisseur CLI transmise à `oma agent spawn` : `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Détection automatique par défaut. |
| `-w, --workspace <path>` | Répertoire de travail de l’agent. Par défaut, le répertoire courant au moment de l’enregistrement. |
| `--once` | Mode à exécution unique : se déclenche une fois, puis se supprime. |
| `--expires-after <duration>` | Expire automatiquement la tâche récurrente après N jours (`0` = indéfini). |
| `--env <KEY1,KEY2>` | Capture les variables d’environnement nommées dans `~/.agents/schedule/env/<id>` (0600) pour injection à l’exécution. Seules les clés listées sont capturées, jamais tout l’environnement. |

**Ce que fait la commande :**
1. Analyse et valide l’expression cron (ou convertit la phrase `--every` en cron).
2. Écrit la tâche dans `~/.agents/schedule/schedules.json` (manifeste global, permissions 0600).
3. Enregistre la tâche auprès du planificateur du système (launchd / systemd --user / schtasks). La tâche système appelle `oma schedule run <id>` à l’intervalle configuré.

**Exemples :**
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

Voir le [guide des agents planifiés](../guide/scheduled-agents.md) pour le parcours complet.

### schedule list

Liste toutes les tâches planifiées de tous les projets, regroupées par projet, avec l’état de dérive du système d’exploitation.

```
oma schedule list [--json]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche au format JSON |

**États de dérive :** `synced` (manifeste et système concordants), `stale` (l’enregistrement système invoque une commande que le CLI actuel n’accepte plus ; lancer `schedule sync` pour le réécrire, `oma update` le fait automatiquement), `missing-in-os` (lancer `schedule sync` pour réparer), `orphan-in-os` (le système possède une tâche absente du manifeste ; lancer `schedule sync --prune` pour la supprimer).

**Exemples :**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Supprime une tâche planifiée du manifeste et du planificateur du système.

```
oma schedule delete <id>
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `id` | Oui | Identifiant de tâche fourni par `schedule list` (format : `sch_<base32-12>`) |

**Exemple :**
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Exécute une tâche planifiée par identifiant. C’est le point d’entrée appelé par le planificateur du système au moment du déclenchement. Cette commande n’est normalement pas lancée à la main, mais elle permet de déboguer une tâche.

```
oma schedule run <id>
```

**Ce que fait la commande :**
1. Recherche `<id>` dans le manifeste (sort avec un code non nul s’il est introuvable).
2. Charge les variables d’environnement capturées depuis `~/.agents/schedule/env/<id>` et les injecte.
3. Appelle `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`.
4. Écrit le résultat dans `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Met à jour `lastFiredAt` dans le manifeste ; se supprime si la tâche est en mode `--once`.
6. Échoue explicitement en cas d’expiration de l’authentification : sort avec un code non nul et affiche `re-auth required: <vendor>` sur stderr. Ne réussit jamais silencieusement.

**Exemple :**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Ressynchronise le manifeste avec le planificateur du système. Répare les dérives après une migration du système ou une réinitialisation du planificateur.

```
oma schedule sync [--prune]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--prune` | Supprime également les tâches système absentes du manifeste (orphan-in-os). Sans `--prune`, les tâches orphelines sont signalées mais conservées. |

**Exemples :**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Gestion de la mémoire

### memory init

Initialise le schéma du magasin de mémoire de coordination.

```
oma memory init [--json] [--output <format>] [--force]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |
| `--force` | Écrase les fichiers de schéma vides ou existants |

**Ce que fait la commande :** crée la structure de répertoires `.agents/state/memories/` et les fichiers de schéma initiaux utilisés par les agents et les workflows pour lire et écrire l’état de coordination.

**Exemples :**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Intégrations et utilitaires

### auth status

Vérifie l’état d’authentification de tous les CLI pris en charge.

```
oma auth status [--json] [--output <format>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Contrôles :** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

**Exemples :**
```bash
oma auth status
oma auth status --json
```

### bridge

Fait transiter le protocole MCP stdio vers un serveur Serena partagé par projet.

```
oma bridge [url] [--context <name>]
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `url` | Non | Se connecte à un endpoint géré par l’appelant au lieu de résoudre un daemon partagé |
| `--context` | Non | Contexte Serena du daemon (par défaut `ide`) ; les daemons sont indexés par ce contexte |

**Ce que fait la commande :** c’est ce qu’exécute par défaut l’entrée MCP Serena de chaque fournisseur — vous ne la lancez pas manuellement. Le transport stdio de Serena donne à chaque session d’agent son propre processus Python et une pile complète de serveur de langage, si bien que le coût augmente avec le nombre de sessions ouvertes. Le bridge ramène ce coût à un serveur par projet : il résout la racine du projet depuis le répertoire de travail, démarre un serveur HTTP Serena épinglé par `--project` lorsqu’aucun serveur ne tourne, puis relaie la session vers celui-ci.

L’épinglage de `--project` est important : un serveur démarré sans cette option expose l’outil `activate_project`, qui permet à n’importe quelle session de changer le projet sous-jacent de toutes les autres.

**Architecture :**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Cycle de vie :** la première session démarre le serveur, les suivantes le réutilisent et chaque proxy s’enregistre comme client. Lorsque la dernière session se détache, le serveur reste chaud pendant 10 minutes — un redémarrage se rattache — puis il est arrêté au prochain démarrage d’un bridge. Si le serveur partagé est inaccessible, le proxy revient à une instance Serena stdio locale à la session.

Désactivez ce comportement avec `serena.mode: stdio` dans `.agents/oma-config.yaml`.

**Exemple :**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Vérifie la sortie d’un agent secondaire selon les critères attendus.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**Arguments de `verify agent` :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `agent-type` | Oui | L’un de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Options :**

| Option | Description | Valeur par défaut |
|:--------|:-----------|:--------|
| `-w, --workspace <path>` | Espace de travail à vérifier | Répertoire courant |
| `--json` | Affiche au format JSON | |
| `--output <format>` | Format de sortie (`text` ou `json`) | |

**Ce que fait la commande :** exécute le script de vérification du type d’agent indiqué, en contrôlant la réussite de la compilation, les résultats des tests et le respect de la portée.

`verify triggers` mesure la précision du détecteur de mots-clés sur un corpus de prompts annoté. Les seuils en pourcentage sont des gardes. Le chemin enregistré est `verify agent` ; l’ancienne forme au niveau racine peut encore apparaître dans l’aide de compatibilité.

**Contrôles communs (tous les types d’agents) :**
- **Contrôle de portée** : lit les portées de tâche dans `.agents/results/plan-{sessionId}.json`. Compare les fichiers modifiés par `git diff` aux motifs de portée définis. Échoue si des fichiers hors de la portée attribuée à l’agent sont modifiés.
- **Précontrôle de charte** : vérifie que `result-{agent}.md` contient un bloc `CHARTER_CHECK:` correctement rempli, sans espace réservé non renseigné.
- **Secrets codés en dur** : analyse les fichiers `.py`, `.ts`, `.tsx`, `.js`, `.dart` à la recherche de motifs comme `password = "..."` et `api_key = "..."` (les fichiers de test et d’exemple sont exclus).
- **Commentaires TODO/FIXME** : compte les commentaires `TODO`, `FIXME`, `HACK` et `XXX` (avertit si l’un d’eux est trouvé).

**Contrôles propres à chaque agent :**

| Type d’agent | Contrôles supplémentaires |
|:-----------|:-----------------|
| `backend` | Validation de syntaxe Python (`py_compile`), détection d’injection SQL (f-string + mots-clés SQL), exécution des tests Python (`pytest`) |
| `frontend` | Compilation TypeScript (`tsc --noEmit`), détection des styles inline (`style={{`), usage du type `any` (échec au-delà de 3), tests frontend (`vitest`) |
| `mobile` | Analyse Flutter/Dart (`flutter analyze` ou `dart analyze`), tests Flutter (`flutter test`) |
| `qa` | Vérification d’auto-contrôle |
| `debug` | Exécute les tests Python ou frontend selon le type de projet détecté |
| `pm` | Vérifie que `.agents/results/plan-{sessionId}.json` existe et contient un JSON valide |

**Format de sortie :**
Chaque contrôle signale `PASS`, `FAIL`, `WARN` ou `SKIP` avec un message détaillé. Le résultat global est `ok: true` uniquement si aucun contrôle n’échoue.

**Exemples :**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Distribue un événement de hook fournisseur via le routeur centralisé des hooks oma (conception 019). C’est l’ABI canonique appelée par l’enveloppe `oma-hook.sh` générée pour chaque fournisseur. La commande peut aussi servir à déboguer ou tester isolément des chaînes de gestionnaires.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Options :**

| Option | Obligatoire | Description |
|:-----|:-----------|:-----------|
| `--vendor <v>` | Oui | Identité du fournisseur. L’un de : `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` ou `qwen`. (Le fournisseur `pi` n’est **pas** valide ici : il utilise le bridge `installPiExtension` en processus au lieu de `oma hook run`.) |
| `--event <e>` | Oui | Nom de l’événement de hook natif enregistré dans les paramètres du fournisseur (par exemple `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | Non | Nom d’outil ou matcher facultatif transmis par l’enregistrement du hook (par exemple `Bash`) |

**Contrat stdin / stdout :**
- **stdin** : payload JSON natif du fournisseur (le même objet que celui transmis aux processus de hook).
- **stdout** : JSON dans le dialecte du fournisseur (ou texte brut pour les prompts kiro) lorsqu’un gestionnaire s’active ; vide lorsqu’aucun gestionnaire ne produit de sortie.
- **code de sortie** : toujours `0` (tolérance aux pannes — les erreurs sont écrites sur stderr et l’agent n’est jamais bloqué).

**Flux des données à l’exécution :**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Déboguer des chaînes de gestionnaires isolément :**

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

Une sortie stdout vide signifie que la chaîne n’a rien fait pour cet événement. Un objet JSON sur stdout est le dialecte du fournisseur que recevrait la session d’agent.

**Notes de portée :**
- Les entrées `statusLine`/hud ne passent pas par `oma hook run` (l’affichage du chemin critique reste sur un chemin `bun` direct).
- Le fournisseur pi utilise son bridge en processus `installPiExtension`, et non `oma hook run`.
- Les livraisons en double issues d’une double installation projet + globale sont écartées dans `oma hook run` (charge utile identique lancée par un wrapper `oma-hook.sh` différent) ; les événements distincts, y compris les appels d’outils parallèles, s’exécutent toujours.

Voir `cli/commands/hook/command.ts` pour l’implémentation du routeur (désignée en interne comme « conception 019 ») et `cli/commands/hook/probe/` pour la matrice de compatibilité par fournisseur.

**Exemples :**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe

Sonde la compatibilité des hooks par fournisseur et affiche une matrice de couverture.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Options :**

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--vendor <list>` | Fournisseurs à sonder, séparés par des virgules | Tous les fournisseurs pris en charge |
| `--output <fmt>` | Format de sortie : `text`, `md` ou `json` | `text` |
| `--hooks-dir <dir>` | Remplace le répertoire `.agents/hooks/core` | Détecté automatiquement |

**Ce que la commande contrôle :** pour chaque fournisseur, vérifie si les scripts de hook fondamentaux (`keyword-detector`, `persistent-mode`, etc.) sont présents et si le JSON de variante mappe correctement les événements vers les chaînes de gestionnaires. Le code de sortie vaut `1` si un fournisseur signale l’état `failed`.

**Exemples :**
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

### vault

Gère les clés API et autres secrets dans le trousseau du système (Trousseau macOS, Secret Service Linux ou Gestionnaire d’identifiants Windows), avec l’appui de `@napi-rs/keyring`. Les valeurs n’apparaissent jamais dans l’historique shell ni dans les fichiers d’environnement ; seuls les noms de clés sont suivis dans `~/.config/oma/vault-index.json` afin que `oma vault list` puisse les énumérer sans exposer les secrets.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Sous-commandes :**

| Sous-commande | Description |
|:------------|:-----------|
| `store <name>` | Demande une valeur secrète (saisie masquée) et l’écrit sous `name` dans le trousseau système. `--value <value>` accepte une valeur inline pour un usage non interactif (visible dans l’historique shell ; préférez l’invite). |
| `get <name>` | Affiche la valeur stockée sur stdout sans décoration afin de pouvoir l’utiliser dans les shells : `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Sort avec le code `2` si la clé n’existe pas. |
| `list` | Liste les noms de clés stockés avec leur horodatage `createdAt`. Les valeurs ne sont jamais affichées. |
| `rm <name>` | Supprime le secret du trousseau et de l’index. |

**Règles des noms de clés :** 1 à 64 caractères parmi `[A-Za-z0-9._-]`. Exemples : `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Dépendance native :** le module natif `@napi-rs/keyring` est chargé à la demande ; s’il ne peut pas être chargé (par exemple sur Linux sans interface graphique avec `libsecret` ou `gnome-keyring`), la commande affiche une erreur explicite avec une indication d’installation au lieu d’un repli silencieux.

**Exemples :**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup

Nettoie les processus d’agents secondaires orphelins et les fichiers temporaires.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--dry-run` | Affiche ce qui serait nettoyé sans modifier les fichiers |
| `-y, --yes` | Ignore les invites de confirmation et nettoie tout |
| `--json` | Affiche au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Ce que la commande nettoie :**
- Fichiers PID orphelins dans le répertoire temporaire système (`/tmp/subagent-*.pid`).
- Fichiers journaux orphelins (`/tmp/subagent-*.log`).

- **Serveurs de langage Serena orphelins** — lorsqu’un client MCP (par exemple Claude) se termine, son `serena start-mcp-server` est réadopté par init et ses enfants LSP (`tsserver`, `pyright`, …, des centaines de Mo) continuent de tourner sans client. Ils sont récupérés ici. Le cas *inactif mais encore attaché* est traité séparément par [`serena reap`](#serena).
- Répertoires Gemini Antigravity (brain, implicit, knowledge) sous `.gemini/antigravity/`.

**Exemples :**
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena

Récupère la mémoire des serveurs de langage Serena propres à chaque projet. Serena lance une pile LSP (`tsserver`, `pyright`, …, environ 300 Mo) pour chaque projet ouvert et la conserve active pendant toute la session ; plusieurs projets ouverts font rapidement monter cette consommation. Le reaper arrête les enfants LSP inactifs ; Serena se répare et les relance au prochain appel d’outil, sans redémarrage.

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Sous-commandes :**

| Commande | Description |
|:--------|:-----------|
| `serena reap` | Récupère maintenant les LSP inactifs. Une exécution interactive agit toujours ; `--quiet` (chemin planifié) respecte l’activation facultative `enabled`. |
| `serena reap --dry-run` | Prévisualise les cibles et la mémoire qui serait libérée — aucun processus n’est arrêté. |
| `serena reaper enable` | Installe une tâche en arrière-plan qui exécute `serena reap --quiet` toutes les 5 minutes (launchd / minuteur systemd / Planificateur de tâches Windows). |
| `serena reaper disable` | Supprime la tâche en arrière-plan. |

**Politique :** `lru` (par défaut) conserve actifs les projets les plus récemment utilisés, au nombre de `keepWarm`, et récupère les autres ; `idle` récupère tout projet inactif depuis plus de `idleMinutes`. Une fenêtre `graceSeconds` protège les appels d’outils en cours.

**Configuration** (`.agents/oma-config.yaml`, activation facultative — désactivée par défaut) :

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Les diagnostics (état KEEP/REAP par projet et source du signal d’activité) sont affichés par [`oma doctor`](#doctor). Les LSP Serena orphelins (client mort) sont récupérés par [`oma cleanup`](#cleanup) quel que soit ce paramètre.

**Exemples :**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize

Visualise la structure du projet sous forme de graphe de dépendances.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` est un alias intégré de `visualize`.

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche au format JSON |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Ce que fait la commande :** analyse la structure du projet et génère un graphe de dépendances montrant les relations entre compétences, agents, workflows et ressources partagées.

**Exemples :**
```bash
oma visualize
oma viz --json
```

### search

Primitives de recherche mécaniques couvrant la récupération, les métadonnées, RSS, les médias, le code et l’évaluation de confiance. Alias : `oma s`. Toutes les sous-commandes écrivent du JSON sur stdout (un objet par ligne, ou une sortie mise en forme avec `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Sous-commandes :**

| Sous-commande | Rôle |
|:-----------|:--------|
| `fetch <url>` | Récupère une URL via un pipeline à escalade automatique (api → probe → impersonate → browser → archive) |
| `api <url>` | Récupère via le gestionnaire d’API de plateforme correspondant (phase 0) |
| `api:search <query>` | Diffuse une recherche par mots-clés vers les plateformes compatibles (`--platforms <list>`) |
| `meta <url>` | Extrait les métadonnées OGP / JSON-LD / Schema.org |
| `rss <url>` | Découvre et analyse un flux RSS / Atom |
| `rss:google <query>` | Construit une URL RSS Google News pour une requête |
| `media <url>` | Extrait les métadonnées multimédias via `yt-dlp` (1858 sites) |
| `archive <url>` | Récupère via le repli AMP / archive.today / Wayback |
| `trust <domain>` | Résout le niveau ou score de confiance d’un domaine |
| `code <query>` | Recherche du code via `gh` (GitHub) ou `glab` (GitLab) |
| `doctor` | Vérifie les dépendances (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Options communes des sous-commandes URL/requête :**

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Délai par stratégie | `15` (`30` pour `media`) |
| `--locale <value>` | En-tête `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Met en forme la sortie JSON | `false` |

**Options supplémentaires de `fetch` :**

| Option | Description |
|:-----|:-----------|
| `--only <strategies>` | Stratégies à exécuter, séparées par des virgules (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Stratégies à ignorer, séparées par des virgules |
| `--include-archive` | Ajoute la stratégie d’archive comme dernier repli |

**Options supplémentaires de `media` :**

| Option | Description |
|:-----|:-----------|
| `--subs` | Écrit les sous-titres |
| `--sub-lang <list>` | Langues des sous-titres, séparées par des virgules (par défaut : `en`) |
| `--format <spec>` | Spécification de format yt-dlp |

**Options supplémentaires de `code` :**

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Hôte | `github` |
| `--language <lang>` | Filtre de langage | |
| `--repo <owner/repo>` | Limite à un dépôt | |
| `--limit <n>` | Nombre maximal de résultats | `20` |

**Codes de sortie :** `0` OK, `1` erreur, `2` bloqué, `3` introuvable, `4` entrée invalide, `5` authentification requise, `6` délai dépassé.

**Exemples :**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

Le registre expose aussi les assistants explicites de découverte suivants :

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

`search` émet du JSON même sans `--json`. `--pretty` ne modifie que la présentation ; il ne modifie pas le schéma du résultat. `search web` accepte `--provider`, `--limit`, `--timeout`, `--json` et `--pretty`. Si une stratégie est bloquée ou qu’une dépendance manque, utilisez le tableau des codes de sortie ci-dessus et relancez `oma search doctor` avant de changer de stratégie.

### image

Génère des images IA avec plusieurs fournisseurs et une délégation parallèle tenant compte de l’authentification. Alias : `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Sous-commandes :**

| Sous-commande | Rôle |
|:-----------|:--------|
| `generate <prompt...>` | Génère des images via `pollinations` (flux/zimage, gratuit), `codex` (gpt-image-2 via OAuth ChatGPT) ou `antigravity` (nano-banana via l’abonnement Gemini Code Assist, sans clé) |
| `doctor` | Vérifie l’authentification et l’état d’installation pour chaque fournisseur |
| `vendor list` | Liste les fournisseurs enregistrés et les modèles pris en charge |

**Options de `image generate` :**

| Option | Description | Valeur par défaut |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Toute valeur `WxH` dont les bords sont divisibles par 16, de 16 à 3840, et le rapport d’aspect de 1:3 à 3:1 ; `auto` est aussi accepté. | Valeur par défaut du fournisseur |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | Valeur par défaut du fournisseur |
| `-n, --count <n>` | Nombre d’images (1..5) | `1` |
| `--output-dir <path>` | Répertoire de sortie | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Autorise les chemins de sortie hors de `$PWD` | `false` |
| `--model <name>` | Surcharge de modèle propre au fournisseur ; ignorée par `antigravity`, dont le modèle est opaque. | Valeur par défaut du fournisseur |
| `--timeout <duration>` | Délai par image | Valeur par défaut du fournisseur |
| `-r, --reference <path>` | Image(s) de référence ; répétable ou séparée par des virgules. Pris en charge par `codex` et `antigravity`, refusé par `pollinations`. Chaque fichier ≤5 Mo en PNG/JPEG/GIF/WebP (validation des octets magiques), 10 au maximum. | |
| `-y, --yes` | Ignore la confirmation de coût | `false` |
| `--no-prompt-in-manifest` | Stocke le SHA256 du prompt au lieu du texte brut | `false` |
| `--dry-run` | Affiche le plan et l’estimation du coût ; n’exécute rien | `false` |
| `--output <format>` | Format de sortie CLI : `text` \| `json` | `text` |

Chaque exécution écrit un `manifest.json` à côté des images générées ; il enregistre le fournisseur, le modèle, le prompt (ou son hash), la taille, la qualité et le coût.

**Exemples :**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video

Planifie, écrit et produit des vidéos courtes, explicatives et de démonstration. `generate` crée le brief, le script, la spécification de rendu et le manifeste d’exécution ; une composition et un compositeur fonctionnel sont nécessaires avant de produire un véritable MP4.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` accepte `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor hyperframes|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` et `--capture-stop duration:<seconds>|selector:<css>`. Utilisez `--source web --url <url>` pour une capture navigateur ; `--source file` est la valeur par défaut. `--output-dir` choisit la racine d’exécution, `--allow-external-output` autorise un chemin hors de `$PWD`, `--max-usd` fixe un plafond de coût, `-y, --yes` ignore la confirmation du coût, `--seed` stabilise les entrées de planification, `--timeout` limite chaque appel à un fournisseur visuel ou musical, `--script` injecte un `script.json` rédigé par l’agent et `--no-brief-in-manifest` stocke un hash du brief au lieu de son texte. `--dry-run` s’arrête après la planification. `--output text|json` contrôle l’enveloppe CLI.

`doctor` vérifie la chaîne d’outils HyperFrames/MPT en cache et accepte `--install`, `--upgrade`, `--install-mpt` et `--install-strudel`. `provider list` indique la disponibilité des fournisseurs et l’état des clés. `compose` crée ou actualise la composition d’exécution et affiche le contrat d’écriture ; `render` exécute le lint, produit le rendu et sonde la sortie. L’absence du compositeur, de la composition ou d’une dépendance de la chaîne d’outils est une erreur. Le chemin réservé aux tests `OMA_VIDEO_MOCK=1` est le seul mode de remplacement ; une exécution normale ne substitue jamais un MP4 texte ou minuscule.

Une sortie JSON réussie contient `runDir`, `manifestPath`, `scriptPath` et `renderSpecPath` ; le manifeste enregistre les fournisseurs sélectionnés, les entrées et les ressources générées. Après `compose`, écrivez la composition générée selon son `AUTHORING.md`, puis relancez `render`. Si une clé fournisseur est indisponible, lancez `oma video doctor` ; si la capture échoue, vérifiez l’URL, le sélecteur, l’appareil et le délai ; si le rendu échoue, corrigez les diagnostics de composition avant de réessayer.

### star

Ajoute une étoile à oh-my-agent sur GitHub.

```
oma star
```

Aucune option. Le CLI `gh` doit être installé et authentifié. La commande ajoute une étoile au dépôt `first-fluke/oh-my-agent`.

**Exemple :**
```bash
oma star
```

### describe

Décrit les commandes CLI au format JSON pour l’introspection à l’exécution.

```
oma describe [command-path]
```

**Arguments :**

| Argument | Obligatoire | Description |
|:---------|:---------|:-----------|
| `command-path` | Non | Commande à décrire. Si omis, décrit le programme racine. |

**Ce que fait la commande :** affiche un objet JSON contenant le nom, la description, les arguments, les options et les sous-commandes de la commande. Les agents IA l’utilisent pour comprendre les capacités CLI disponibles.

**Exemples :**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Commandes de recherche et d’artefacts

Ces familles sont utiles lorsque la sortie est un artefact de recherche, une présentation ou un rapport. Elles restent volontairement courtes ici ; les guides liés expliquent le workflow et les choix de récupération.

### intel suggest

Propose du travail produit à partir de signaux du marché et du dépôt :

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` fournit la configuration complète. Pour une exécution ponctuelle, `--topic`, `--target`, `--repos`, `--since` et `--last-commits` choisissent les entrées. `--output-dir` contrôle les rapports locaux et `--fixture` fournit un jeu JSON local pour une revue déterministe. `--create-issue` crée les candidats acceptés dans GitHub et exige une cible configurée ainsi qu’une confirmation ; associez `--base-repo <owner/name>` pour sélectionner le dépôt et n’utilisez `--yes` que dans un contexte d’automatisation déjà approuvé. `--dry-run` et `--json` sont des chemins d’inspection sûrs.

### market

La famille market délègue au moteur amont `last30days` résolu. Commencez par la garde et le résolveur :

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` renvoie le code 2 avec une reformulation pour les sujets piégés par les mots-clés ou trop larges ; `--force` contourne cette garde uniquement si l’utilisateur veut explicitement poursuivre. `market resolve` accepte `--refresh` et `--offline`, tandis que `market update` actualise le cache du moteur géré. `market run` transmet ses arguments restants au moteur Python résolu et ajoute `--save-dir` depuis `market.save_dir` lorsqu’un sujet est fourni. Lisez [Recherche de marché](../guide/market-research.md) avant de choisir les options amont ; sa sortie `--help` appartient au moteur géré et évolue avec la version.

### docs

Utilisez la famille docs pour examiner la dérive documentaire. Les commandes produisent des rapports ; `sync` liste les candidats pour l’agent hôte et ne modifie pas les fichiers.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` contrôle les références locales et régénère `docs/generated/doc-refs.json` ; `--urls-sync` attend le passage URL facultatif de `lychee`. `sync` utilise par défaut les modifications indexées, puis `HEAD~1..HEAD`, et émet des candidats `{doc, changedFiles, matchedRefs}`. `i18n` signale la dérive structurelle entre l’anglais et la traduction, tandis que `lint` signale les problèmes de style des documents traduits. Aucune de ces sous-commandes ne modifie automatiquement la documentation.

### slide

`oma slide` travaille sur un répertoire de fragments HTML de diapositives en 1920×1080. Le plus petit parcours fonctionnel est :

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

La porte de qualité signale les débordements, chevauchements et problèmes de taille de police. Utilisez `--slide <file>` pour une vérification sur une seule diapositive et `--report-file <path>` avec la sortie JSON. N’exportez qu’après validation :

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

L’export PPTX est expérimental et repose sur des trames rasterisées. `slide import pptx <file>`, `slide asset fetch-video <url>` et `slide style list|preview|get <slug>` couvrent les ressources d’entrée et la découverte de styles. Utilisez [oma-slide](../guide/content-and-research.md#slides-and-presentations) pour les choix d’écriture et les contraintes de scène fixe.

### scholar

Recherche des articles et des métadonnées de travaux, puis valide les sidecars avant partage :

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` peut limiter les résultats OpenAlex avec `--year-min` et forcer les fournisseurs de repli avec `--always-fallback`. `get --section` accepte `statements`, `evidence`, `relations`, `artifacts` ou `citation`. `lint --lenient` transforme les références croisées pendantes en avertissements ; `--fail-on-warning` fait échouer la CI en cas d’avertissement. Le CLI interroge d’abord Knows, puis les replis OpenAlex et Semantic Scholar ; il n’envoie pas les sidecars en amont.

### explain

`/explain` est le workflow d’écriture. Le CLI valide les artefacts déjà créés :

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Passez un fichier ou `--input-dir`, jamais les deux. La validation couvre le contrat HTML autonome et signale les échecs lisibles par machine ; elle n’évalue pas l’exactitude de l’explication. Voir [Explicateur de code](../guide/code-explainer.md).

### diagram

Résolvez le moteur avant qu’un workflow n’émette un diagramme structurel :

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` accepte `--engine auto|archify|mermaid`, `--refresh` et `--offline`. `diagram update` actualise la copie archify gérée. `diagram archify` transmet les arguments restants à l’exécutable amont résolu et propage son code de sortie. Mermaid reste la source de vérité Markdown ; le HTML est un artefact dérivé. Voir [Moteur de diagrammes](../guide/diagram-engine.md).

## Inspection de l’état, des modèles et de la mémoire

Les familles suivantes exposent l’état durable des workflows ainsi que les diagnostics des modèles et fournisseurs. Préférez `--dry-run` pour les actions de type nettoyage et `--json` lorsqu’un autre programme consommera le résultat.

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state trajectory <session-id>
oma state trajectory <session-id> --open
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` enregistre un événement L1 avec une catégorie et des métadonnées de session explicites. `state migrate` déplace les sessions historiques vers le profil sélectionné. `state repair` répare les fichiers d’état malformés. `state decisions list` et `state inject-log list|get` inspectent les décisions obligatoires et les entrées d’audit des injections. `state trajectory` associe les événements L1 d’une session aux transcriptions des sessions des fournisseurs dans lesquelles elle s’est exécutée (Claude Code, Codex, Antigravity et Grok). Le résultat est un journal unique, tour par tour, des prompts, des réponses du modèle, des appels d’outils, des durées et de l’utilisation des tokens ; `--open` l’affiche dans le tableau de bord web, à l’adresse `/trajectory`. Les autres fournisseurs n’apparaissent qu’avec leurs événements L1. Les transcriptions sont lues depuis `CLAUDE_CONFIG_DIR` ou `~/.claude`, `CODEX_HOME` ou `~/.codex`, `~/.gemini/antigravity-cli` et `~/.grok`. `state activate`, `state archive` et `state purge` sont des actions explicites ; les anciens indicateurs booléens sont rejetés. N’archivez ou ne purgez qu’après examen d’un dry-run, car ces commandes modifient l’état local.

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` compare le registre aux listes de fournisseurs en direct et peut sonder les nouveaux candidats. `model probe` teste un slug auprès du CLI de son fournisseur. `model propose` produit un correctif `models:` pour `oma-config` ; utilisez `--write` uniquement si vous voulez modifier la configuration. La disponibilité du fournisseur et le quota peuvent faire échouer les sondes même lorsqu’une entrée du registre est valide.

### agent evidence commands

Les exécutions natives d’agents suivent une séquence appuyée par des éléments de preuve :

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` charge le contexte sélectionné par graphe ; `begin` démarre une exécution et affiche un ID d’exécution généré ainsi qu’un chemin de revendication ; `verify` reçoit cet ID et lance les contrôles épinglés (`--required`), ou les restreint avec `--affected` ; `finish` reçoit l’ID et le chemin du fichier de revendication. `agent resume --dry-run` signale les tâches prêtes et réutilisables, tandis que `agent resume --max-attempts <n>` ne réessaie que les tâches autorisées par le plan. Voir [Résultats et reprise des agents](../guide/agent-results-and-resume.md) pour la forme du plan et de la revendication. Ces commandes appartiennent au contrat d’exécution OMA ; le travail utilisateur ordinaire peut utiliser `agent spawn`, `agent parallel` ou `agent review`.

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configure les identifiants de connexion Honcho ou d’embeddding ; `--dry-run` prévisualise les destinations sans lire ni écrire de clés. `memory setup` prépare un endpoint AgentMemory et peut éventuellement l’installer ou le démarrer avec `--install` ou `--start`. `memory daemon` et `memory service` gèrent l’intégration avec un processus local ou un service système. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` et `memory gc` sont des actions de maintenance ; inspectez leur sortie JSON ou dry-run avant de les appliquer.

## Gestion des compétences

### skills audit

Contrôle les compétences installées à la recherche de descriptions qui se chevauchent, de généralités qui capturent tout et de dégradation du routage liée à la taille de la bibliothèque.

```
oma skill audit [--json] [--output <format>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--json` | Affiche du JSON pour la CI/CD |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Contrôles effectués :**
- **Similarité par paire des descriptions** : similarité cosinus TF-IDF entre chaque paire de compétences installées. Avertit à ≥ 60 %, échoue à ≥ 75 %.
- **Détection des généralités attrape-tout** : signale toute compétence dont la similarité moyenne avec les autres est une valeur aberrante positive (≥ moyenne + 1,5 × écart-type), ce qui indique une description trop générique susceptible de détourner le routage.
- **Dégradation liée à la taille de la bibliothèque** : avertit lorsque plus de 60 compétences sont installées (la précision du routage diminue logarithmiquement à mesure que la bibliothèque grandit).
- **Contrôle du périmètre** : avertit lorsqu’une compétence s’étend en bundle — plus de 20 documents de référence (fichiers `.md` autres que `SKILL.md`, arbres vendus exclus) ou un corps de `SKILL.md` de plus de 25 000 caractères. Les compétences ciblées sont plus efficaces que les bundles (SkillsBench, arXiv:2602.12670) ; la correction consiste à scinder, pas à supprimer.

**Codes de sortie :** `0` si tous les résultats sont dans la zone d’avertissement ou s’il n’y en a aucun ; `1` si au moins une paire est dans la zone d’échec.

**Exemples :**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Détecte les défauts d’écriture propres à une compétence dans un unique `SKILL.md`, contrairement à `skills audit` qui contrôle les relations *entre* compétences. La vérification s’appuie sur la taxonomie des défauts de compétence d’arXiv:2607.01456 (plus de 99 % des fichiers SKILL.md observés dans la nature présentent au moins un défaut).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--skill <id>` | Vérifie une seule compétence |
| `--json` | Affiche du JSON pour la CI/CD |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Défauts génériques (toutes les compétences) :**

| Défaut | Gravité | Signification |
|:------|:---------|:--------|
| `missing-name` | fail | Nom `name` absent ou vide dans le frontmatter |
| `missing-description` | fail | Description `description` absente ou vide dans le frontmatter — le routage en dépend |
| `weak-description` | warn | Description de moins de 40 caractères — trop mince pour router |
| `body-too-long` | warn | Corps de SKILL.md de plus de 500 lignes — déplacer le détail dans `resources/` avec divulgation progressive |
| `template-placeholder` | warn | Texte `{Placeholder}` résiduel hors des spans de code |
| `broken-reference` | fail | Référence vers un fichier `resources/`, `config/`, `scripts/` ou `assets/` inexistant |

**Défauts SSL-lite** (la validation SSL-lite est obligatoire lorsqu’un nom déclaré de compétence ou son nom de répertoire/alias exposé commence par `oma-`, même sans `## Scheduling` ; un alias sans préfixe ne peut pas contourner un nom déclaré en `oma-`. Les compétences ordinaires sans préfixe adoptent le format en incluant `## Scheduling`) :

| Défaut | Gravité | Signification |
|:------|:---------|:--------|
| `ssl-structure` | fail | Sections de premier niveau différentes de `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | Il n’existe pas exactement un `### Canonical command path` ou `### Canonical workflow path` |
| `missing-boundaries` | warn | Aucun `### When NOT to use` — les compétences sans limites détournent le routage |
| `empty-failure-recovery` | warn | `### Failure and recovery` absent ou vide (les puces et lignes de tableau sont acceptées) — encode les mécanismes d’échec selon SkillLens |

**Codes de sortie :** `0` en l’absence de défaut de gravité fail ; `1` si au moins un défaut fail est présent.

**Exemples :**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Mesure l’utilité d’une compétence : son chargement améliore-t-il réellement les résultats de tâches conservées ? C’est le pendant *utilité* de `skills audit` (qui mesure le chevauchement des limites de description). Là où `audit` demande « deux compétences sont-elles redondantes ? », `eval` demande « cette compétence aide-t-elle ? ».

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Options :**

| Option | Description |
|:-----|:-----------|
| `--skill <id>` | Identifiant de compétence à évaluer (nom simple, sans séparateurs de chemin). Par défaut : `_all`. |
| `--mock` | Rejoue les exécutions enregistrées depuis `_rollouts/` (par défaut ; déterministe, sans délégation LLM). Sûr pour la CI. |
| `--live` | Délégation d’agent en direct — lance deux branches (référence et traitement) par tâche via `oma agent spawn --read-only`. Affiche un aperçu du coût et demande confirmation sans `--yes`. |
| `--record` | Écrit les exécutions directes capturées (y compris les verdicts du juge) dans `_rollouts/` pour un futur rejeu `--mock`. Pertinent uniquement avec `--live`. |
| `--yes` | Ignore la confirmation de l’aperçu du coût. Pertinent uniquement avec `--live`. |
| `--task-dir <path>` | Remplace le répertoire des fixtures de tâches (il doit se trouver dans la racine du workspace). Par défaut : `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Plafonne le nombre de tâches évaluées (dans l’ordre de tri déterministe). |
| `--require-coverage` | Sort avec un code non nul lorsque moins de 5 tâches sont trouvées (évite un succès silencieux en CI). |
| `--json` | Affiche du JSON pour la CI/CD |
| `--output <format>` | Format de sortie (`text` ou `json`) |

**Fonctionnement :**

Pour chaque fixture de tâche dans `.agents/eval/<skill>/` :
1. **Branche de référence** — le prompt de tâche est délégué sans charger la compétence.
2. **Branche de traitement** — `SKILL.md` est ajouté au début du prompt, puis celui-ci est délégué.
3. Chaque branche est notée par son vérificateur (juge par défaut ; assert ou regex pour les activations déterministes).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Décisions :**

| Décision | Condition |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (code de sortie 1) |
| `insufficient` | Moins de 5 tâches notables (code de sortie 1 uniquement avec `--require-coverage`) |

**Mode recommandé :** utilisez `--live` avec les vérificateurs juge pour mesurer l’utilité réelle d’une compétence. Utilisez `--mock` pour rejouer hors ligne des verdicts de juge enregistrés ou pour exécuter des contrôles de contrat déterministes `assert`/`regex`.

**Variable d’environnement :** `OMA_SKILLEVAL_MOCK=1` force le mode simulé quels que soient les indicateurs.

**Codes de sortie :** `0` pour pass ou warn ; `1` pour fail ou insufficient avec `--require-coverage`.

**Exemples :**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

Voir le [guide d’évaluation de l’utilité des compétences](../guide/skill-eval.md) pour le format des fixtures `.agents/eval/` et les types de vérificateurs.

---

### skills opt

Optimise le `SKILL.md` d’une compétence avec une évolution persistante de style WikiSkill. Un mainteneur consolide les éléments observables des exécutions dans une connaissance délimitée, un proposeur émet des modifications ajoutées/supprimées/remplacées et les résultats rejetés persistent entre les exécutions. Les candidats doivent améliorer strictement le découpage de validation conservé ; `--apply` exige en plus une amélioration stricte sur le découpage final de test détenu par le runner. Base de recherche : WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Options :**

| Option | Valeur par défaut | Description |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Identifiant de compétence à optimiser (nom simple, sans séparateurs de chemin). |
| `--dry-run` | **oui (par défaut)** | Propose les modifications et affiche le diff sans modifier `SKILL.md` ; les éléments d’évolution générés sont tout de même enregistrés. |
| `--apply` | — | Applique les modifications acceptées ; sauvegarde l’original avant une écriture atomique et n’écrit qu’une amélioration validée. |
| `--mock` | **oui (par défaut)** | Rejoue les modifications d’optimiseur et verdicts d’évaluation enregistrés (déterministe, hors ligne). Sûr pour la CI. |
| `--live` | — | Délégation d’optimiseur LLM en direct — entraîne de vrais appels de modèle à chaque époque. Affiche un aperçu du coût et demande confirmation sans `--yes`. |
| `--max-epochs <n>` | `8` | Nombre maximal d’époques d’optimisation. |
| `--edits-per-epoch <k>` | `4` | Nombre de modifications candidates proposées par époque. |
| `--lr <chars>` | `600` | Budget de taux d’apprentissage textuel : variation nette maximale de caractères par modification. |
| `--yes` | — | Ignore la confirmation de l’aperçu du coût (uniquement avec `--live`). |
| `--json` | — | Affiche du JSON pour la CI/CD. |
| `--output <format>` | `text` | Format de sortie (`text` ou `json`). |

**Dépendance stricte :** nécessite au moins 5 fixtures de tâches dans `.agents/eval/<skill>/`. Affiche un message clair si ce nombre n’est pas atteint. Voir le [guide d’évaluation de l’utilité des compétences](../guide/skill-eval.md) pour les écrire.

**Découpage entraînement/validation/test :** les fixtures sont réparties de manière déterministe à 60/20/20. Le mainteneur et le proposeur ne voient que les éléments TRAIN, la sélection des candidats utilise les tâches VALIDATION conservées et le découpage TEST détenu par le runner reste caché jusqu’à la fin de l’évolution. `--apply` n’écrit que si le gain de validation et le gain du test final progressent strictement.

**Note SSOT :** les compétences dont l’identifiant commence par `oma-` sont écrasées par `oma update`. Pour ces compétences, `--apply` est déconseillé — utilisez le `--dry-run` par défaut et transmettez le diff proposé en amont. Les compétences écrites par l’utilisateur s’appliquent librement.

**Codes de sortie :** `0` si l’optimisation est terminée ; `1` si les fixtures sont insuffisantes ou si l’argument est invalide.

**Exemples :**
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

Voir le [guide d’optimisation des compétences](../guide/skill-opt.md) pour le parcours complet et les garde-fous SSOT / surapprentissage.

---

### harness eval

Compare une surcouche `.agents/` candidate avec le harness OMA courant sur des tâches de dépôt appariées et isolées. L’agent cible et la route fournisseur restent fixes ; des contrôles déterministes notent les fichiers et la sortie produits par chaque branche.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Option | Description |
|:-----|:------------|
| `--suite <path>` | Suite YAML obligatoire. La suite et les workspaces de fixtures doivent se trouver dans la racine du projet. |
| `--candidate <path>` | Racine candidate contenant une surcouche `.agents/` limitée. |
| `--mock` | Rejoue une exécution enregistrée dont le hash correspond (par défaut ; déterministe et hors ligne). |
| `--live` | Exécute les branches de référence et candidate avec l’agent cible de la suite. |
| `--record` | Conserve une exécution directe pour un futur rejeu simulé. Nécessite `--live`. |
| `--record-file <path>` | Remplace le chemin d’enregistrement ; il doit rester dans la racine du projet. |
| `--yes` | Ignore la confirmation du coût de l’exécution directe. |
| `--timeout-minutes <n>` | Délai par branche, identique pour la référence et la candidate. Par défaut : `15`. |
| `--require-coverage` | Sort avec un code non nul lorsque moins de cinq tâches appariées sont notables. |
| `--json` | Affiche l’évaluation complète au format JSON. |
| `--output <format>` | Format de sortie (`text` ou `json`). |

**Porte de décision :** pass exige au moins 5 tâches appariées, un gain d’au moins 5 points de pourcentage et zéro régression. Une régression échoue toujours. Une couverture inférieure au minimum donne `insufficient` et ne sort avec un code non nul qu’avec `--require-coverage`.

**Isolation :** les fichiers candidats peuvent remplacer uniquement le contenu de `.agents/agents`, `.agents/rules`, `.agents/skills` et `.agents/workflows` dans la branche candidate temporaire. Hooks, configuration, état, fixtures d’évaluation, liens symboliques, variantes de fournisseurs, modifications protégées du frontmatter d’exécution des agents et fichiers du harness fournisseur appartenant aux fixtures sont refusés. Une branche échoue si elle modifie des définitions protégées pendant l’exécution. La découverte de fournisseurs fondée sur HOME est refusée pour l’évaluation directe. La route de l’agent principal est fixe ; l’épinglage du modèle des sous-agents imbriqués n’est pas encore appliqué.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Voir le [guide d’évaluation du harness](../guide/harness-eval.md) pour le schéma de suite, les contrôles pris en charge, le modèle d’isolation et les limites actuelles.

### harness incident promote

Transforme un incident capturé en fixture de régression pour la compétence que l’agent en échec a exercée.

```
oma harness incident promote <id> [--skill <id>] [--draft] [--force] [--json]
```

### harness feedback

Promeut chaque incident non promu et, avec `--live` ou `--apply`, optimise chaque compétence touchée contre sa suite agrandie.

```
oma harness feedback [--scan-runs] [--live] [--apply] [--max-epochs <n>] [--incident <ids...>] [--json]
```

Voir le [guide des cas de régression d’incident](../guide/harness-incidents.md).

---

### help

Affiche les informations d’aide.

```
oma help
```

Affiche le texte d’aide complet avec toutes les commandes disponibles.

### version

Affiche le numéro de version.

```
oma version
```

Affiche la version CLI actuelle et quitte.

---

## Variables d’environnement

| Variable | Description | Utilisée par |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Définie à `json` pour forcer la sortie JSON sur toutes les commandes qui la prennent en charge | Toutes les commandes avec l’option `--json` |
| `DASHBOARD_PORT` | Port du tableau de bord web | `dashboard web` |
| `MEMORIES_DIR` | Remplace le chemin du répertoire de mémoires | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Définie à `1` pour forcer le mode simulé dans `oma skill eval` quels que soient les indicateurs | `skills eval` |
| `OMA_HOOK_DEDUP` | Définie à `0` pour désactiver la suppression des livraisons en double dans `oma hook run`. | `hook` |
| `OMA_HOOK_DEDUP_DIR` | Remplace le répertoire privé de revendications utilisé pour supprimer les livraisons de hooks en double (par défaut : `$XDG_RUNTIME_DIR/oma-hook-dedup`, sinon `<tmpdir>/oma-hook-dedup-<uid>`). | `hook` |

---

## Alias

| Alias | Commande complète |
|:------|:------------|
| `viz` | `visualize` |
