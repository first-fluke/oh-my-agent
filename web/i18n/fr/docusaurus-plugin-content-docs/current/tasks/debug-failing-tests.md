---
title: Déboguer un test en échec
description: Reproduisez un échec de test, isolez sa cause, appliquez une correction bornée et vérifiez une régression avec le lanceur de tests existant du projet.
---

# Déboguer un test en échec

Utilisez `oma-debug` lorsque vous avez une commande en échec, une pile d’appels ou un résultat incorrect reproductible.

## Charger la compétence

Demandez à votre agent de codage d’exécuter cette commande et de lire ses instructions ainsi que son répertoire de support :

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Fournir l’entrée

- La commande en échec exacte et la sortie d’échec pertinente complète.
- Le comportement attendu, le checkout ou la ref, la version du runtime et les services locaux requis.
- Les fichiers ou le changement récent que vous soupçonnez, plus le périmètre de modification autorisé.

## Donner la tâche

Cet exemple concret utilise les fixtures de régression d’amorçage de plugin de ce dépôt. Utilisez votre propre commande en échec pour un autre projet.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Vérifier le résultat

Attendez-vous à l’échec reproduit, à son chemin causal, au correctif borné et à un test de régression lié à cet échec. Le rapport doit séparer un environnement indisponible d’un défaut de code diagnostiqué.

Vérifiez que la régression échoue pour le comportement d’origine et passe avec le correctif. Relancez la commande indiquée dans le même environnement, puis inspectez les résultats des tests liés. Si la reproduction reste bloquée, attendez-vous au bloqueur exact et aux preuves plus faibles disponibles.

## Dépendances et étape suivante

L’agent utilise le lanceur de tests de votre projet et les outils de navigation du code configurés. L’exemple exige Bun et les dépendances de développement du dépôt déjà présentes. Ces fixtures de plugin sont ignorées sous Windows ; utilisez un test en échec pris en charge par votre plateforme. Le chargement de la compétence n’installe pas les dépendances et ne répare pas un service manquant.

Consultez l’[exemple de réparation des hooks de plugin](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) pour le changement de source réel et les frontières des fixtures. Pour une exécution gérée ou des hooks de projet, [choisissez une configuration de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) qui inclut `oma-debug`.
