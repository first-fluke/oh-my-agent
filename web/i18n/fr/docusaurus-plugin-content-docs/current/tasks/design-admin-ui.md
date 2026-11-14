---
title: Concevoir une interface d’administration autour de ses tâches réelles
description: Définissez la hiérarchie, la densité des tableaux, les états et la passation de design d’un écran d’administration tout en conservant la pile et le contrat visuel du projet.
---

# Concevoir une interface d’administration autour de ses tâches réelles

Utilisez `oma-design` pour décider comment un écran d’administration doit servir ses utilisateurs avant de modifier le code de l’application.

## Charger la compétence

Demandez à votre agent de codage d’exécuter cette commande et de lire les instructions renvoyées ainsi que le répertoire de support :

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Fournir l’entrée

- Un écran en fonctionnement, des captures, ou les composants pertinents.
- Qui utilise l’écran et les actions qu’il doit accomplir.
- Le `DESIGN.md` existant, les tokens, les composants, les langues et les exigences de responsive et d’accessibilité.

## Donner la tâche

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Vérifier le résultat

Attendez-vous à des décisions de hiérarchie et de densité propres à l’écran, au comportement des états, au mappage des tokens sémantiques et à une passation d’implémentation. Les changements de système acceptés appartiennent au `DESIGN.md` canonique du projet.

Contrôlez la proposition au regard de la tâche de triage : un utilisateur peut-il identifier le ticket suivant, changer les filtres, ouvrir les détails et se remettre d’une erreur ? Inspectez le focus clavier, le texte coréen et anglais lisible, et le comportement en écran étroit lorsqu’un spécimen rendu est disponible. Une passation limitée au document laisse l’exécution navigateur et accessibilité non vérifiée.

## Dépendances et étape suivante

Pour une nouvelle direction d’interface d’administration ou de produit, le [contrat de routage](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) sélectionne Interface Design. La critique, l’audit et le polissage d’une interface existante sélectionnent Impeccable ; les autres directions artistiques web utilisent Taste. Un seul fournisseur est chargé pour l’opération courante.

Ces instructions externes peuvent avoir besoin de leurs propres téléchargements ou outils d’exécution. La pile existante, la marque, la couverture CJK, la cible WCAG et les exigences de mouvement réduit restent des contraintes. Charger des instructions ne rend pas l’interface et ne la vérifie pas.

Utilisez le spécialiste frontend du projet pour l’implémentation. Pour les hooks et workflows du projet, [choisissez une configuration de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) qui inclut `oma-design`.
