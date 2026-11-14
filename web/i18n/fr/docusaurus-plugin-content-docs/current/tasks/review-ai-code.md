---
title: Relire le code IA avant de fusionner
description: Relisez le code écrit par une IA pour les bugs, les contrôles manquants et les régressions, à partir d’un diff borné et de constats reproductibles.
---

# Relire le code IA avant de fusionner

Utilisez `oma-qa` pour relire un changement au regard de son comportement prévu. Commencez par le diff et les contrôles existants du projet.

## Charger la compétence

Demandez à votre agent de codage d’exécuter cette commande, puis de lire les instructions renvoyées et le répertoire de support :

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Fournir l’entrée

- Le changement ou une ref de comparaison locale, comme `origin/main`.
- Le comportement attendu, en particulier les permissions, les changements de données et le traitement des échecs.
- Les commandes de lint et de test existantes et toute limite d’environnement.

## Donner la tâche

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Vérifier le résultat

Attendez-vous à des constats ordonnés avec une reproduction ou une preuve de code décisive, un correctif suggéré et les commandes réellement exécutées. Si aucun défaut n’est confirmé, le rapport doit tout de même identifier le périmètre inspecté et les lacunes restantes.

Ouvrez chaque emplacement cité et vérifiez que le déclencheur l’atteint. Relancez le contrôle étroit utilisé comme preuve. Un outil manquant ou un chemin non testé est une lacune de vérification ; un résumé de revue seul n’établit pas que le changement peut être livré en sécurité.

## Dépendances et étape suivante

L’agent a besoin d’accéder au diff, au code local et aux outils de contrôle existants du projet. Les contrôles de navigateur, de sécurité et de performance ont besoin de leur cible et de leur outillage correspondants. Charger la compétence n’approvisionne pas ces dépendances.

Pour un échec confirmé, poursuivez avec [déboguer un test en échec](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). Si vous voulez des hooks de projet ou des workflows d’équipe, [choisissez une configuration de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) qui inclut `oma-qa`.
