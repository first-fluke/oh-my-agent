---
title: "Cas d'usage : Correction de bugs"
description: Boucle structurée reproduire-diagnostiquer-corriger-tester avec escalade basée sur la sévérité.
---

# Cas d'usage : Correction de bugs

## Format de prise en charge

Commencez par un rapport reproductible :

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Triage par sévérité

Classifiez rapidement pour choisir la vitesse de réponse :

- `P0` : perte de données, contournement d'authentification, panne en production
- `P1` : flux utilisateur majeur cassé
- `P2` : comportement dégradé avec solution de contournement
- `P3` : mineur/non bloquant

`P0/P1` doivent toujours impliquer une revue QA/sécurité.

## Boucle d'exécution

1. Reproduire exactement dans un environnement minimal.
2. Isoler la cause racine (pas seulement un correctif de symptôme).
3. Implémenter le correctif le plus petit et le plus sûr.
4. Ajouter des tests de régression pour le chemin défaillant.
5. Revérifier les chemins adjacents susceptibles de partager le même mode de défaillance.

## Modèle de prompt pour oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Signaux d'escalade courants

Escaladez vers le QA ou la sécurité lorsque le bug touche :

- authentification/session/rafraîchissement de token
- limites de permissions
- cohérence des paiements/transactions
- régressions de performance sous charge

## Validation post-correctif

- la reproduction originale n'échoue plus
- aucune nouvelle erreur dans les flux connexes
- les tests échouent avant le correctif et réussissent après
- le chemin de retour arrière est clair si un correctif d'urgence est nécessaire

## Critères de terminaison

La correction de bugs est terminée lorsque :

- la cause racine est identifiée et documentée
- le correctif est vérifié par des contrôles reproductibles
- la couverture de régression est en place
