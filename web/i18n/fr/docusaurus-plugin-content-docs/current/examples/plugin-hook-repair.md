---
title: Réparer les hooks de plugin et l’amorçage du projet
description: Comment les chemins de hooks du marketplace, l’approvisionnement Bash et les reçus d’amorçage du projet ont été réparés avec des fixtures de régression.
---

# Réparer les hooks de plugin et l’amorçage du projet

La réparation du plugin dans [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) a traité le dispatch des hooks et le comportement d’amorçage. Son parent, `82649cbd`, fournit l’état d’avant pour cette comparaison.

## Mécanisme de l’échec

L’[ancien manifeste de hooks](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) invoquait des fichiers sous `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Ces chemins dépendent de fichiers générés ; la fixture avec un cache de plugin neuf les laisse hors du répertoire du plugin.

L’[ancien amorçage](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) exécutait aussi l’installateur Bash téléchargé via `sh -c`. Son marqueur de succès vivait dans des données de plugin partagées, et le chemin rapide ne vérifiait que ce marqueur, la version de la CLI et la présence du fichier de réglages du projet. Un second projet disposant d’un fichier de réglages pouvait donc sauter son propre câblage.

## Réparation

Le [nouveau dispatcher](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) appelle la CLI installée. Lorsqu’un hook de projet exécutable correspondant possède déjà l’événement, le hook du marketplace s’en remet à lui afin que l’événement ne soit pas dispatché deux fois.

Le [nouvel amorçage](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh) :

- Exécute l’installateur Bash via Bash et contrôle les échecs d’approvisionnement.
- Force l’installation du projet même lorsqu’un réglage d’installation globale est hérité.
- Stocke le reçu dans `.agents/state/plugin-bootstrap.version` de ce projet.
- Vérifie la configuration, les métadonnées de version, le wrapper exécutable et les événements enregistrés avant de réutiliser un reçu.
- Conserve les diagnostics d’installation échouée dans `.agents/state/plugin-bootstrap.last-error.log` sans enregistrer un reçu de succès.

## Reproduire les contrôles de régression

Utilisez un checkout jetable de `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` avec Bun et les dépendances de développement du dépôt déjà disponibles. Depuis sa racine :

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

Les fixtures couvrent des frontières distinctes :

| Fixture | Ce que ses assertions vérifient |
|---|---|
| [Amorçage](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Approvisionnement Bash uniquement, reçus de projet séparés, configuration CUE seule, câblage incomplet, échecs de version et diagnostics conservés. |
| [Dispatch des hooks](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Dispatch avec un cache neuf, budgets de temps des handlers, préservation de la charge utile, propriété du hook de projet correspondant, et repli lorsque cette propriété est absente ou invalide. |
| [Intégration de l’installation](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Deux installations de projet, réglages utilisateur préservés, une seule livraison prompt/Stop sur les deux enregistrements, et nouvelle tentative après un câblage échoué. |

Ces fixtures créent des répertoires temporaires et de fausses commandes CLI ; la fixture d’intégration utilise le compositeur de hooks réel. Elles vérifient le dispatch shell et les effets enregistrés sans installation de marketplace ni appel de modèle. Les suites sont ignorées sous Windows.

## Ce qu’il reste à vérifier dans une session réelle

Une exécution de fixtures qui passe n’établit pas une session Claude Code fonctionnelle. Dans le projet cible réel, inspectez le reçu et la configuration, lancez `oma doctor`, redémarrez la session, et exercez le comportement pertinent de prompt et de Stop tout en contrôlant leurs effets observés. La disponibilité de la CLI, les identifiants, le comportement des fournisseurs et la politique de hooks de l’hôte ont besoin de leurs propres preuves.

Pour la même démarche reproduire, corriger, vérifier sur un autre échec, commencez par [déboguer un test en échec](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Choisir une configuration](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) explique quand le runtime du projet est nécessaire.
