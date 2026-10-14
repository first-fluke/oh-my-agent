---
title: Pourquoi choisir oh-my-agent
sidebar_label: Pourquoi oh-my-agent
description: Choisissez oh-my-agent lorsque votre dépôt a besoin de compétences et de workflows d'agents versionnés, du dispatch multi-fournisseur et d'une vérification explicite.
---

# Pourquoi choisir oh-my-agent

oh-my-agent ajoute une couche gérée par le dépôt autour des CLI d'agents que votre équipe utilise déjà. Le répertoire `.agents/` contient les [compétences](./glossary.md#skill), [workflows](./glossary.md#workflow), [définitions d'agents](./glossary.md#agent-definition), règles et la configuration des modèles. Les fichiers propres à chaque fournisseur sont générés à partir de cette [source de vérité](./glossary.md#ssot) ; le comportement peut donc être relu et modifié avec le projet.

## Choisissez-le lorsque le dépôt a besoin d'une couche de coordination {#choose-it-when-the-repository-needs-the-coordination-layer}

OMA convient lorsque vous avez besoin d'au moins l'un des éléments suivants :

- **Plusieurs hôtes ou fournisseurs d'agents.** `model_preset: auto` utilise la configuration native du runtime courant. Les presets fixes et personnalisés peuvent router les rôles vers d'autres fournisseurs ; `oma agent spawn` prend en charge le dispatch non natif.
- **Un workflow d'équipe reproductible.** `/work` gère une tâche délimitée, `/orchestrate` coordonne le travail délégué, `/ultrawork` exécute le travail en parallèle avec des étapes de revue et `/ralph` répète une tâche avec une phase de juge explicite.
- **Des instructions détenues par le dépôt.** Les compétences, workflows, règles et définitions d'agents vivent à côté du code. `oma link` projette les fichiers sélectionnés dans les formats pris en charge par les fournisseurs.
- **Des vérifications mécaniques et des résultats durables.** Les exécutions d'agents peuvent écrire des reçus structurés d'état et de résultat, tandis que `oma verify agent <agent-type>` et `oma docs verify` fournissent des vérifications explicites.

Si un projet utilise un seul hôte et n'a pas besoin de compétences, de workflows ou de routage partagé entre fournisseurs, les fichiers `.agents/` et les commandes CLI supplémentaires peuvent ne pas justifier la configuration. OMA est une couche de coordination : elle ne remplace ni le modèle de l'hôte, ni l'éditeur, ni les critères d'acceptation propres au projet.

## La vérification est une commande que vous choisissez {#verification-is-a-command-you-select}

Exécutez `oma verify agent <agent-type> --workspace <path>` lorsque vous voulez les vérifications associées à un rôle backend, frontend, mobile, QA, debug ou planification. Le vérificateur combine des inspections statiques avec les commandes configurées, comme les tests, les vérifications de types, les contrôles SQL ou `flutter analyze` ; voir [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). Le rapport affiche le résultat de chaque vérification. La réussite de ces contrôles ne prouve pas qu'une fonctionnalité respecte ses exigences produit ou métier ; les critères d'acceptation de la tâche doivent donc toujours être examinés.

`/ralph` ajoute une phase de [juge](./glossary.md#judge) distincte lorsque vous choisissez ce workflow. Elle revérifie les critères déclarés à chaque itération et enregistre les artefacts du workflow ; ce n'est pas une porte qui s'exécute pour chaque prompt ordinaire. Le chargement d'une compétence ne lance pas non plus tous les workflows ni toutes les commandes de vérification.

## Le dispatch reste visible {#dispatch-remains-visible}

`oma doctor --profile` affiche le fournisseur et le modèle résolus pour chaque rôle de dispatch. `oma agent spawn <agent-id> <prompt> <session-id>` est la voie CLI explicite lorsqu'un rôle n'est pas géré par l'hôte courant. Les règles de résolution des modèles et le comportement propre à chaque fournisseur sont documentés dans les [valeurs par défaut importantes](./important-defaults.md) et [Modèles par agent](../guide/per-agent-models.md).

Les hooks ne peuvent activer un workflow que lorsque l'intégration de l'hôte concerné est activée. Le routage natif des compétences est assuré par l'hôte, tandis que le routage des workflows suit le workflow ou le hook sélectionné ; un prompt simple ne garantit donc pas l'exécution d'une compétence ou d'une porte particulière.

Les contrôles de coordination facultatifs sont documentés dans le [plafond de quota de session](../guide/configuration-reference.md#session-quota-caps), la [boucle de nouvelle tentative et d'exploration de `/orchestrate`](../core-concepts/workflows.md#orchestrate) et l'[attribution des workspaces](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## Le compromis en pratique {#the-practical-trade-off}

OMA offre à l'équipe un emplacement partagé pour définir le routage, les étapes d'exécution, les vérifications et les fichiers de sortie. En contrepartie, l'équipe doit maintenir cette configuration de dépôt à jour et décider quels workflows ou quelles commandes de vérification font partie de son contrat d'acceptation. Ce compromis est utile lorsque la cohérence entre contributeurs compte davantage que l'installation la plus minimale.

Pour la discussion de positionnement d'origine, voir [l'issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Étapes suivantes

- [Démarrage rapide](./quick-start.md) : installer, vérifier la configuration et exécuter une tâche délimitée
- [Valeurs par défaut importantes](./important-defaults.md) : ce que l'installateur active et comment le modifier
- [Installation](./installation.md#presets) : choisir un preset de compétences qui couvre les workflows que vous prévoyez d'utiliser
- [Workflows](../core-concepts/workflows.md) : quand utiliser `/work`, `/orchestrate`, `/ultrawork` et `/ralph`
- [Dépannage](../guide/troubleshooting.md) : solutions aux problèmes d'installation, de fournisseurs et de hooks
