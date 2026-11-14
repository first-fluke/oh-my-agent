---
title: Démarrage rapide
description: Choisissez une compétence ou un preset de runtime, puis exécutez une première tâche ciblée avec vérification observée.
---

# Démarrage rapide

Utilisez une tâche ciblée pour vérifier le résultat. Chargez une compétence dans l’agent de codage que vous utilisez déjà, ou installez le runtime lorsque vous avez besoin de hooks de projet, d’agents spécialisés et de workflows. [Choisir une configuration](./choose-setup.md) explique les parcours disponibles et leurs dépendances.

## 1. Choisir la configuration {#1-install}

Pour la tâche Git en lecture seule ci-dessous, demandez à votre agent de charger la compétence et de lire ses instructions ainsi que son répertoire de support :

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Poursuivez avec la tâche à l’étape 3. Les opérations CLI de la compétence, les autres compétences, les règles du projet et les services externes restent des dépendances distinctes. Le chargement de cette compétence n’exécute pas l’installateur OMA.

### Installer le runtime lorsque nécessaire

L’amorçage du runtime peut préparer `bun`, `uv`, Serena, CUE et la commande globale `oma`. Sélectionnez l’IDE ou le CLI d’IA que vous utilisez déjà ; les intégrations de fournisseurs et de navigateur dépendent des tâches que vous prévoyez d’exécuter.

Depuis le répertoire du projet, lancez l’installateur d’amorçage :

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Dans Windows PowerShell, lancez :

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

L’installation conserve une langue de réponse existante ou détecte automatiquement la langue du système. L’installation interactive vous demande les fournisseurs CLI, les [fournisseurs de capacités](./glossary.md#capability-provider), le [preset de modèles](./glossary.md#model-preset), le [preset de compétences](./glossary.md#skill-preset) du projet et toute variante de pile. Pour un premier lancement, gardez les valeurs par défaut, sélectionnez le fournisseur que vous utilisez déjà et choisissez le preset de projet le plus proche du dépôt. Consultez [Presets](./installation.md#presets) pour les compétences de chaque preset et pour les [workflows qui nécessitent des compétences hors d’un preset](./installation.md#workflows-that-need-skills-outside-a-preset).

Si vous avez déjà `bun`, utilisez directement l’installateur :

```bash
bunx oh-my-agent@latest
```

Les scripts d’amorçage installent dans le projet courant. Utilisez `oma install --global` pour une installation au niveau de HOME ; consultez [Installation globale](../guide/global-install.md) avant de mélanger des installations de projet et globales.

## 2. Vérifier le résultat

Pour le chargement temporaire d’une compétence, confirmez que l’agent a lu les instructions sélectionnées et vérifiez la tâche elle-même. Pour une installation du runtime, lancez le contrôle d’état depuis le même répertoire de projet :

```bash
oma doctor
```

La commande en mode texte affiche un rapport avec des sections telles que `CLI Status` et `Skills Status`, puis renvoie son code de sortie au shell. Les lignes exactes dépendent des hôtes installés dans le projet :

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` peut signaler les problèmes d’intégrations facultatives sous forme d’avertissements. La préparation par défaut d’AgentMemory est vérifiée pendant `oma install` et `oma update` ; un échec de l’installation, du démarrage ou du contrôle de santé interrompt ces commandes. Sélectionner `providers.semantic_memory: none` ou `honcho`, ou définir `OMA_NO_AGENTMEMORY=1`, permet d’ignorer cette préparation.

Pour un état lisible par machine, `oma doctor --json` renvoie un code de sortie non nul lorsque le rapport contient des problèmes. Utilisez `oma doctor --profile` pour examiner le modèle et le CLI résolus pour chaque rôle d’agent canonique.

Si `oma` est indisponible mais que Bun est installé, lancez le même contrôle sans la commande globale :

```bash
bunx oh-my-agent@latest doctor
```

Si la commande `oma` reste introuvable, ouvrez un nouveau shell ou ajoutez le répertoire bin du gestionnaire de paquets à `PATH` ; [Installation](./installation.md#method-3-global-install) montre comment installer la commande `oma`. Si `oma doctor` signale une configuration invalide, corrigez le champ nommé et relancez-le. Ne supprimez pas `.agents/oma-config.yaml` pour récupérer : c’est la configuration appartenant à l’utilisateur qui conserve les réglages lors des mises à jour.

## 3. Exécuter une petite tâche

Ouvrez un dépôt Git existant dans votre outil d’IA. Utilisez la compétence `oma-scm` chargée, ou la copie installée par un preset de runtime nommé. Si vous avez utilisé la sélection Custom, incluez `oma-scm` pour cet exemple :

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Comparez la branche et les changements signalés avec la sortie Git réelle. L’agent doit indiquer quelles commandes ont été exécutées et leur code de sortie. Cette tâche en lecture seule ne nécessite ni test de code ni build.

Une simple invite ne démarre aucun workflow ; lorsque le hook de prompt est activé, il ajoute une indication de compétence à titre consultatif. Le routage des compétences est effectué par l’hôte ou le workflow sélectionné : une invite arbitraire adressée à l’hôte ne garantit donc ni hook, ni compétence précise. Le contrat d’exécution doit tout de même examiner les conventions du dépôt, respecter le périmètre en lecture seule demandé et rendre compte des vérifications observées. Les fichiers exacts et la commande dépendent du projet.

Pour une tâche qui traverse les frontières API et interface utilisateur, sélectionnez explicitement `/work` ou `/orchestrate`. Pour un seul domaine, poursuivez avec [Exécution d’une compétence unique](../guide/single-skill.md). Le [Guide d’utilisation](../guide/usage.md) contient des exemples plus longs.

## 4. Connaître les valeurs par défaut du runtime avant de passer à l’échelle

Le chargement temporaire d’une compétence ne configure pas ces valeurs par défaut du runtime. Pour les hooks de projet, la configuration des fournisseurs ou les workflows d’équipe, utilisez le parcours runtime dans [Choisir une configuration](./choose-setup.md).

OMA démarre avec `model_preset: auto`, Serena pour l’intelligence du code, Agent Memory pour la mémoire sémantique, la recherche web native et la télémétrie désactivée. Serena utilise le transport partagé `bridge` et se met à jour automatiquement sauf configuration contraire. Le MCP DevTools du navigateur est facultatif ; une installation interactive neuve propose d’abord Aside. Consultez [Valeurs par défaut importantes](./important-defaults.md) pour les conséquences et les clés de remplacement.

Si une tâche gérée se bloque, commencez par `oma agent status <session-id> [agent-id]`, puis examinez son reçu dans `.agents/state/agent-runs/` et le chemin de claim structuré injecté. Ces enregistrements indiquent l’exécution, la tâche, l’espace de travail, le code de sortie et l’état de vérification. Les fichiers lisibles `result-*.md` et `progress-*.md` dans `.agents/state/memories/` ajoutent du contexte lorsqu’ils existent. Ne relancez que la plus petite commande en échec après avoir confirmé que l’exécution n’est plus active. Un [workflow persistant](./glossary.md#persistent-workflow) reste actif jusqu’à sa fin ou jusqu’à ce que vous disiez `workflow done` ; consultez [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) pour récupérer un fichier d’état.

## Étapes suivantes

- [Choisir une configuration](./choose-setup.md) pour une seule compétence, un preset de runtime ou le plugin Claude Code
- [Valeurs par défaut importantes](./important-defaults.md) pour la priorité, les fournisseurs et les choix de récupération
- [Installation](./installation.md) pour les presets, la configuration des fournisseurs, les installations globales et les mises à jour
- [Agents](../core-concepts/agents.md) pour les 33 paquets de compétences et les rôles de dispatch
- [Workflows](../core-concepts/workflows.md) pour la planification, l’exécution parallèle, l’assurance qualité et les modes persistants
- [Dépannage](../guide/troubleshooting.md) lorsque l’installation, un fournisseur ou un hook ne se comporte pas comme prévu
