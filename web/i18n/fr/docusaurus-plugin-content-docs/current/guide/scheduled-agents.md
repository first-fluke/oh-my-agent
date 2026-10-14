---
title: "Guide : Agents planifiés"
sidebar_label: Agents planifiés
description: Exécuter n’importe quel agent selon un planning récurrent ou ponctuel avec le planificateur du système (macOS launchd, Linux systemd, Windows Task Scheduler), sans exiger qu’un environnement fournisseur reste ouvert.
---

# Agents planifiés

`oma schedule` vous permet d’exécuter n’importe quel agent selon un planning horaire, indépendamment de l’environnement fournisseur d’IA (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode ou pi) actuellement ouvert. Le planificateur du système déclenche la tâche, qui appelle ensuite `oma agent spawn` sans interface en utilisant les identifiants du fournisseur déjà mis en cache sur le disque.

---

## Fonctionnement

Lorsque vous lancez `oma schedule create`, oma :

1. écrit un enregistrement de tâche dans le manifeste global à `~/.oma/schedule/schedules.json` ;
2. enregistre la tâche auprès du planificateur du système (macOS launchd, Linux systemd --user ou Windows Task Scheduler). La tâche du système appelle `oma schedule run <id>` selon l’intervalle cron configuré ;
3. au moment du déclenchement, `oma schedule run` recherche la tâche, injecte les variables d’environnement capturées, appelle `oma agent spawn` et écrit le journal d’exécution dans `~/.oma/schedule/runs/<id>/<timestamp>.md`.

Le manifeste est la source unique de vérité (SSOT). Le planificateur du système n’est qu’un exécuteur. Tout l’état — définitions de tâches, journaux d’exécution et horodatages du dernier déclenchement — se trouve sous `~/.oma/schedule/`.

### Conçu pour être global uniquement

`oma schedule` est volontairement global pour l’utilisateur, et non propre à un projet. Comme le planificateur du système exécute les tâches indépendamment du répertoire de travail courant, un registre central unique est le seul SSOT pratique. Chaque tâche enregistre le projet auquel elle appartient via `workspace` et `projectLabel` ; ainsi, `schedule list` peut regrouper les tâches par projet même si le registre est partagé.

Il n’existe pas d’option `--global` ; les commandes de planning utilisent `$OMA_HOME/schedule/`, par défaut `~/.oma/schedule/`. Les tâches enregistrées dans le système reçoivent explicitement le répertoire résolu, afin d’ouvrir le même registre sans shell de connexion. Lancez `oma schedule sync` après avoir déplacé ce répertoire pour actualiser les commandes des tâches et les chemins des journaux.

### Backends du système d’exploitation

| Plateforme | Backend principal | Repli | stderr de `oma schedule run` |
|---|---|---|---|
| macOS | launchd (plist + `launchctl`) | — | `runs/<id>/stderr.log` |
| Linux | minuteur systemd --user | `crontab` utilisateur lorsque `systemctl --user` est indisponible | `runs/<id>/stderr.log` (systemd) ; non enregistré (crontab) |
| Windows | Task Scheduler (`schtasks`) | — | Non enregistré |

oma sélectionne automatiquement le backend disponible. Vous n’avez pas à le configurer manuellement.

---

## Comparaison : schedule, ralph et Claude /loop

Ces trois fonctions sont parfois confondues parce qu’elles impliquent toutes de « réexécuter plus tard ». Il s’agit de concepts différents.

| Fonction | Déclencheur | Portée | Survit au redémarrage du fournisseur ? |
|---|---|---|---|
| `oma schedule` | Basé sur l’heure (cron) | Inter-fournisseurs, niveau système | Oui — le planificateur du système se déclenche même si aucun environnement fournisseur n’est ouvert |
| `ralph` | Basé sur l’achèvement (boucle de hook Stop) | Inter-fournisseurs | Seulement tant que la session courante est active ; ralph est une boucle « continuer jusqu’à la fin », pas un minuteur |
| Claude Code `/loop` | Basé sur l’heure (cron en processus) | Environnement Claude uniquement | Non — se déclenche seulement lorsque Claude Code fonctionne |

Utilisez `schedule` lorsque vous voulez qu’une tâche s’exécute à 9 h chaque jour ouvré. Utilisez `ralph` lorsqu’un agent doit continuer à itérer jusqu’à atteindre un seuil de qualité. Utilisez `/loop` seulement lorsque vous êtes déjà dans Claude Code et n’avez pas besoin de la portabilité inter-fournisseurs.

---

## Démarrage rapide

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create` affiche l’ID de tâche dont `run` et `delete` ont besoin :

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

Déclenchez manuellement une nouvelle tâche une fois pour vérifier le prompt et les identifiants du fournisseur avant sa première exécution planifiée :

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## Commandes

### schedule create

Enregistrer une tâche d’agent planifiée.

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Arguments :**

| Argument | Requis | Description |
|---|---|---|
| `agent-id` | Oui | Agent transmis à `oma agent spawn` : un ID canonique (`orchestrator`, `architecture`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `qa`, `docs`, `tf-infra`, `explore`) ou un nom de définition comme `qa-reviewer` ou `backend-engineer`. Il n’est pas validé à l’enregistrement ; lancez donc `oma schedule run <id>` une fois après avoir créé la tâche. |
| `prompt` | Oui | Description de la tâche transmise à l’agent lors de l’exécution |

**Options :**

| Option | Description |
|---|---|
| `--cron "<expr>"` | Expression cron à 5 champs (par exemple `"0 9 * * *"` pour 9 h chaque jour). Mutuellement exclusive avec `--every`. |
| `--every "<phrase>"` | Intervalle en langage naturel (voir le tableau ci-dessous). Mutuellement exclusif avec `--cron`. |
| `--vendor <vendor>` | Remplacement du fournisseur CLI transmis à `oma agent spawn` : `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. La détection automatique depuis `oma-config.yaml` est utilisée par défaut. |
| `-w, --workspace <path>` | Répertoire de travail de l’agent lors de l’exécution. Par défaut, le répertoire de travail courant au moment de l’enregistrement. |
| `--once` | Mode ponctuel : la tâche se supprime après la première exécution qui se termine avec le code 0. Une exécution en échec conserve la tâche, qui se déclenche donc de nouveau à la prochaine correspondance cron. La valeur par défaut est récurrente. |
| `--expires-after <duration>` | Supprime une tâche récurrente lors de son premier déclenchement après cette durée. Utilisez un nombre entier de jours avec une unité, comme `30d` ; un nombre seul (`30`) est rejeté. `0` signifie indéfini (valeur par défaut). |
| `--env <KEY1,KEY2>` | Capture les variables d’environnement nommées (uniquement celles listées) dans `~/.oma/schedule/env/<id>` (permissions 0600) pour injection lors de l’exécution. Les secrets ne sont jamais écrits dans le manifeste lui-même. |
| `--dry-run` | Affiche le cron résolu et toute note d’arrondi sans écrire de tâche de planificateur, d’entrée de manifeste ni de fichier d’environnement. |
| `--accept-rounded` | Requis pour enregistrer un intervalle en langage naturel après son arrondi par OMA à une étape exprimable par cron. Prévisualisez d’abord avec `--dry-run`. |

Une seule des options `--cron` ou `--every` est requise.

#### --every : intervalles en langage naturel

`--every` accepte les formes suivantes. oma les analyse en expression cron à 5 champs et affiche une note lorsque l’intervalle demandé est arrondi à l’étape exprimable par cron la plus proche.

| Forme de phrase | Exemple | Notes |
|---|---|---|
| Unité compacte | `5m`, `2h`, `1d` | Minute, heure, jour |
| Every + compact | `every 20m`, `every 2h` | |
| Every + mot | `every 5 minutes`, `every 2 hours` | Les mots d’unité au pluriel sont acceptés |
| Secondes | `30s` | Arrondi au minimum d’une minute ; cron ne peut pas exprimer les intervalles inférieurs à la minute |

Les intervalles non divisibles sont arrondis à l’étape régulière la plus proche et une note est affichée. Par exemple, `--every 7m` est arrondi à `6m` (`*/6`), car 7 ne divise pas 60.

Prévisualisez un intervalle arrondi avant de l’enregistrer :

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Si l’aperçu est omis, la commande refuse d’enregistrer un intervalle arrondi. Les plannings utilisent les règles horaires locales du planificateur du système sélectionné.

**Exemples :**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

Lister toutes les tâches planifiées de tous les projets, regroupées par projet, avec l’état de dérive du système d’exploitation.

```bash
oma schedule list [--json]
```

**Options :**

| Option | Description |
|---|---|
| `--json` | Sortie JSON lisible par machine |

**États de dérive :**

| État | Signification |
|---|---|
| `synced` | La tâche existe dans le manifeste et le planificateur du système |
| `stale` | La tâche est enregistrée, mais l’enregistrement système invoque une commande que le CLI actuel n’accepte plus (par exemple `schedule:run <id>` écrit avant la standardisation des chemins de commande). Lancez `schedule sync` pour le réécrire ; `oma update` le fait automatiquement. |
| `missing-in-os` | La tâche est dans le manifeste mais absente du planificateur du système. Lancez `schedule sync` pour la réparer. |
| `orphan-in-os` | Un planning d’agent (`dev.oma.sch_*`) existe dans le planificateur du système mais pas dans le manifeste. Lancez `schedule sync --prune` pour le supprimer. |

Les services internes tels que `dev.oma.agentmemory`, `dev.oma.serena-daemon-gc` et `dev.oma.serena-reaper` ont leurs propres gestionnaires de services. `schedule list` les exclut de la détection des orphelins, et `schedule sync --prune` les conserve.

**Sortie (texte) :**

Les tâches sont regroupées par libellé de projet. Chaque ligne affiche : ID, expression cron, agent, fournisseur, backend du système d’exploitation, caractère récurrent et état de dérive.

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

Les tâches créées par `oma harness evolution enable` apparaissent avec l’agent `__builtin__` ; elles exécutent `oma harness evolution run --scheduled` dans ce projet. Gérez-les avec `oma harness evolution enable` et `disable` (voir [Évolution du harnais du projet](./harness-evolution.md)) plutôt qu’avec `oma schedule delete`. `oma schedule builtin-evolution-add` et `oma schedule inspect`, qui figurent dans `oma schedule --help`, sont des assistants internes de cette commande.

**Exemples :**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Supprimer une tâche planifiée du manifeste et du planificateur du système.

```bash
oma schedule delete <id>
```

**Arguments :**

| Argument | Requis | Description |
|---|---|---|
| `id` | Oui | ID de tâche issu de `schedule list` (format : `sch_<base32-12>`) |

Si la suppression dans le planificateur du système échoue (par exemple si le backend est temporairement indisponible), un avertissement est affiché mais l’entrée du manifeste est tout de même supprimée.

**Exemple :**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run

Exécuter une tâche planifiée par ID. Le planificateur du système l’appelle au moment du déclenchement et elle n’est normalement pas appelée manuellement.

```bash
oma schedule run <id>
```

Le wrapper :
1. recherche l’ID de tâche dans le manifeste. Se termine avec un code non nul s’il est introuvable. Si la durée `--expires-after` est écoulée, supprime la tâche au lieu de l’exécuter ;
2. charge les variables d’environnement capturées depuis `~/.oma/schedule/env/<id>` (si présent) et les injecte dans le processus créé ;
3. appelle `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>` ;
4. écrit le résultat d’exécution dans `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md` ;
5. met à jour `lastFiredAt` dans le manifeste ;
6. si `--once` était défini et que l’agent s’est terminé avec le code 0, supprime la tâche (manifeste et planificateur du système).

**Les échecs d’authentification sont explicites :** si les identifiants du fournisseur ont expiré, la tâche se termine avec un code non nul et écrit `re-auth required: <vendor>` sur stderr (enregistré dans `runs/<id>/stderr.log` avec launchd et systemd). Le fournisseur apparaît comme `unknown` lorsque la tâche a été créée sans `--vendor`. Elle ne réussit pas silencieusement.

Vous pouvez appeler `schedule run` manuellement pour le débogage :

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync

Resynchroniser le manifeste avec le planificateur du système. Utilisez cette commande après une migration du système, une réinitialisation du planificateur ou pour réparer une dérive.

```bash
oma schedule sync [--prune]
```

**Options :**

| Option | Description |
|---|---|
| `--prune` | Supprime aussi les tâches OS présentes dans le planificateur mais absentes du manifeste (état orphan-in-os). Sans `--prune`, les tâches orphelines sont signalées mais pas supprimées. |

**Exemples :**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` exécute la même réconciliation (sans `--prune`) après chaque mise à jour, de sorte qu’une version du CLI qui modifie l’écriture de la commande `oma schedule run` ne peut pas laisser des enregistrements système existants pointer vers une commande que le nouveau binaire rejette. Les enregistrements écrits par d’anciennes versions avec `oma schedule:run <id>` continuent aussi de fonctionner : cette ancienne écriture reste acceptée pour les tâches invoquées par le système.

---

## Structure de stockage

Tout l’état des plannings se trouve sous `~/.oma/schedule/` :

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

Permissions :
- répertoire `~/.oma/schedule/` : `0700`
- fichiers `schedules.json` et `env/<id>` : `0600`

**Les secrets ne sont jamais écrits dans `schedules.json`.** L’option `--env` écrit uniquement les clés nommées dans un fichier `0600` séparé sous `env/`. Seules les clés explicitement listées sont capturées ; un dump complet de l’environnement n’est jamais stocké.

---

## Notes de sécurité

- `schedule create` est une opération sur un chemin de confiance : seul l’utilisateur authentifié peut enregistrer des tâches. N’exposez pas `schedule create` à des entrées externes ou non fiables. Une invite planifiée est du code arbitraire exécuté ultérieurement.
- `schedule run` exécute uniquement les tâches dont l’ID existe dans le manifeste. Une injection arbitraire d’argv n’est pas possible.
- Les identifiants fournisseur sur disque (par exemple `~/.codex/auth.json`, `~/.grok/auth.json`) sont utilisés tels quels pour la répartition sans interface. Aucun contrôle d’authentification supplémentaire n’est appliqué. Si les identifiants expirent, la tâche échoue explicitement.

---

## Conseils et dépannage

**Vérifier les journaux d’exécution :**

```bash
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**La tâche affiche `missing-in-os` après un redémarrage du système :**

Lancez `oma schedule sync` pour réenregistrer toutes les tâches du manifeste auprès du planificateur du système.

**La tâche s’est déclenchée mais les identifiants du fournisseur avaient expiré :**

Sous macOS (launchd) et Linux (systemd), recherchez `re-auth required: <vendor>` dans `~/.oma/schedule/runs/<id>/stderr.log`. Le journal d’exécution `<timestamp>.md` contient la sortie propre de l’agent et son code de sortie. Les backends crontab et Task Scheduler ne conservent pas ce stderr ; lancez `oma schedule run <id>` dans un terminal pour le voir. Authentifiez-vous à nouveau avec le CLI du fournisseur (par exemple `claude login`, `codex login`), puis lancez manuellement `oma schedule run <id>` pour vérifier avant le prochain déclenchement.

**Modifier une tâche :**

Il n’existe pas de `schedule update`. Créez d’abord la tâche de remplacement, puis supprimez l’ancien ID avec `oma schedule delete <old-id>`. `--env` copie les valeurs des variables au moment de la création de la tâche ; après la rotation d’un secret, recréez donc la tâche avec la nouvelle valeur exportée dans votre shell.

**`--every` a arrondi mon intervalle :**

Lorsque oma arrondit votre intervalle, il affiche une note expliquant la modification. Si vous avez besoin d’un intervalle précis qui ne divise pas proprement 60 minutes ou 24 heures, utilisez `--cron` avec une expression explicite à 5 champs.

**Supprimer toutes les tâches d’un projet :**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Prise en charge de Windows :**

Sous Windows, oma utilise `schtasks` pour enregistrer les tâches. Les enregistrements de Task Scheduler ne peuvent pas être relus ; `schedule list` signale donc chaque tâche enregistrée comme `stale`, et `schedule sync` (également exécuté par `oma update`) les réenregistre toutes. Sous Windows, considérez `stale` comme attendu ; `missing-in-os` et `orphan-in-os` indiquent toujours une dérive.

Notez que `schtasks` ne peut pas exprimer toutes les formes cron. Les formes prises en charge sont : `*/N * * * *` (toutes les N minutes), `M * * * *` (toutes les heures à :M), `M H * * *` (quotidienne), `M H * * D` (hebdomadaire ; `D` peut être un jour unique, une plage comme `1-5` ou une liste séparée par des virgules comme `1,3,5`) et `M H D * *` (mensuelle). Les autres expressions (par exemple une liste séparée par des virgules dans le champ des minutes) sont rejetées lors de `schedule create` sous Windows.

`--every` ne produit une forme prise en charge que pour les intervalles en minutes qui divisent 60 (par exemple `--every 5m` ou `--every 30m`). Les intervalles en heures et en jours (`--every 2h`, `--every "every 6 hours"`, `--every 1d`) et les pas horaires comme `--cron "0 */4 * * *"` produisent `0 */N * * *` ou `0 0 */N * *`, que Task Scheduler rejette lors de `schedule create`. Sous Windows, utilisez plutôt une heure fixe, par exemple `--cron "0 9 * * 1-5"`.

---

## Voir aussi

- [Évolution du harnais du projet](./harness-evolution.md) — la tâche intégrée `__builtin__` qui exécute l’amélioration budgétée des compétences.
- [Évaluation du harnais](./harness-eval.md) — comment les commandes d’évaluation s’articulent.
