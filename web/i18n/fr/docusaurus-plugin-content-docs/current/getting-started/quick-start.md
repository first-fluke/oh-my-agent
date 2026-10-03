---
title: Démarrage rapide
description: Exécutez une tâche au périmètre défini, de l’installation à la vérification, avec la sortie attendue et la récupération.
---

# Démarrage rapide

Utilisez cette page pour exécuter une petite tâche et consigner un résultat concret. Vous avez besoin d’un répertoire de projet et d’au moins un CLI ou IDE d’IA pris en charge. L’installateur peut initialiser `bun`, `uv`, Serena et CUE sur macOS, Linux ou Windows ; l’intégration de l’hôte sélectionné est requise pour la première invite, tandis que les intégrations de fournisseurs et de navigateur sont facultatives.

## 1. Installer

### Voie la plus rapide — les compétences dans vos agents

```bash
npx skills add first-fluke/oh-my-agent
```

Cette commande installe le pack de compétences OMA dans les runtimes d’agents détectés (Claude Code, Cursor, Codex, etc.). Les compétences enseignent à l’agent comment travailler. Pour les portes du hook Stop, la vérification des artefacts, les juges indépendants et le CLI `oma`, installez le harnais complet ci-dessous.

Les installations limitées aux compétences ne fournissent ni le CLI `oma`, ni les hooks, ni les workflows, ni les juges. Utilisez une compétence installée désignée par son nom pour la première tâche ci-dessous ; utilisez le harnais complet lorsque vous avez besoin des contrôles du CLI.

### Harnais complet (portes, hooks, CLI)

Depuis le répertoire du projet, lancez l’installateur d’amorçage :

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Dans Windows PowerShell, lancez :

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

L’installation interactive vous demande la langue des réponses, les fournisseurs CLI, les fournisseurs de capacités, le préréglage de modèle, le préréglage de compétences du projet et toute variante de pile. Pour un premier lancement, gardez les valeurs par défaut, sélectionnez le fournisseur que vous utilisez déjà et choisissez le préréglage de projet le plus proche du dépôt.

Si vous avez déjà `bun`, utilisez directement l’installateur :

```bash
bunx oh-my-agent@latest
```

Les scripts d’amorçage installent dans le projet courant. Utilisez `oma install --global` pour une installation au niveau de HOME ; consultez [Installation](./installation.md) avant de mélanger des installations de projet et globales.

## 2. Vérifier le résultat (harnais complet uniquement)

Si vous avez installé le harnais complet, lancez le contrôle d’état depuis le même répertoire de projet :

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

Les intégrations MCP, navigateur, mémoire ou intelligence du code facultatives peuvent apparaître comme des avertissements ; elles ne sont nécessaires que pour les tâches qui les utilisent. Pour un état lisible par machine, `oma doctor --json` renvoie un code de sortie non nul lorsque le rapport contient des problèmes. Utilisez `oma doctor --profile` pour examiner le modèle et le CLI résolus pour chaque rôle d’agent canonique.

Si `oma` est indisponible mais que Bun est installé, lancez le même contrôle sans la commande globale :

```bash
bunx oh-my-agent@latest doctor
```

Si la commande `oma` reste introuvable, ouvrez un nouveau shell ou ajoutez le répertoire bin du gestionnaire de paquets à `PATH`. Si `oma doctor` signale une configuration invalide, corrigez le champ nommé et relancez-le. Ne supprimez pas `.agents/oma-config.yaml` pour récupérer : c’est la configuration appartenant à l’utilisateur qui conserve les réglages lors des mises à jour.

Si vous avez installé uniquement les compétences, ignorez ce contrôle du CLI et passez à la tâche à compétence nommée ci-dessous.

## 3. Exécuter une petite tâche

Ouvrez le dépôt dans l’outil d’IA configuré et demandez une compétence nommée et un résultat autonome :

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

L’hôte doit identifier la compétence sélectionnée, examiner une cible et indiquer soit une modification ciblée du lien, soit que le lien est déjà valide. Incluez la sortie de la commande et son code de sortie pour tout contrôle effectivement exécuté. Une installation limitée aux compétences n’ajoute ni `/debug`, ni `/ralph`, ni hooks, ni portes de workflow ; demander la compétence nommée garde cette première tâche dans les capacités installées.

Lorsque le hook de mots-clés est activé pour l’hôte sélectionné, il peut activer un workflow correspondant. Le routage des compétences est effectué par l’hôte ou le workflow sélectionné : une invite arbitraire adressée à l’hôte ne garantit donc ni hook, ni compétence précise, ni `CHARTER_CHECK`. Le contrat d’exécution doit tout de même examiner les conventions du dépôt, limiter la modification au périmètre demandé et en rendre compte avec sa vérification. Les fichiers exacts et la commande dépendent du projet.

Pour une tâche qui traverse les frontières API et interface utilisateur, sélectionnez explicitement `/work` ou `/orchestrate`. Pour un seul domaine, poursuivez avec [Exécution d’une compétence unique](../guide/single-skill.md). Le [Guide d’utilisation](../guide/usage.md) contient des exemples plus longs.

## 4. Connaître les valeurs par défaut avant de passer à l’échelle

OMA démarre avec `model_preset: auto`, Serena pour l’intelligence du code, Agent Memory pour la mémoire sémantique, la recherche web native et la télémétrie désactivée. Serena utilise le transport partagé `bridge` et se met à jour automatiquement sauf configuration contraire. Le MCP DevTools du navigateur est facultatif ; une installation interactive neuve propose d’abord Aside. Consultez [Valeurs par défaut importantes](./important-defaults.md) pour les conséquences et les clés de remplacement.

Si une tâche gérée se bloque, commencez par `oma agent status <session-id> [agent-id]`, puis examinez son reçu dans `.agents/state/agent-runs/` et le chemin de claim structuré injecté. Ces enregistrements indiquent l’exécution, la tâche, l’espace de travail, le code de sortie et l’état de vérification. Les fichiers lisibles `result-*.md` et `progress-*.md` dans `.agents/state/memories/` ajoutent du contexte lorsqu’ils existent. Ne relancez que la plus petite commande en échec après avoir confirmé que l’exécution n’est plus active. Un workflow persistant reste actif jusqu’à sa fin ou jusqu’à ce que vous disiez `workflow done` ; consultez [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) pour récupérer un fichier d’état.

## Étapes suivantes

- [Valeurs par défaut importantes](./important-defaults.md) pour la priorité, les fournisseurs et les choix de récupération
- [Installation](./installation.md) pour les préréglages, la configuration des fournisseurs, les installations globales et les mises à jour
- [Agents](../core-concepts/agents.md) pour les 33 paquets de compétences et rôles de répartition
- [Workflows](../core-concepts/workflows.md) pour la planification, l’exécution parallèle, l’assurance qualité et les modes persistants
