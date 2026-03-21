---
title: Introduction
description: Ce qu'est oh-my-agent et comment fonctionne la collaboration multi-agent.
---

# Introduction

oh-my-agent est un orchestrateur multi-agent pour l'IDE Antigravity. Il route les requêtes vers des skills spécialisés et coordonne les agents via les mémoires Serena.

## Ce que vous obtenez

- Routage de skills piloté par la requête
- Exécution basée sur les workflows pour la planification, la revue et le débogage
- Orchestration CLI pour l'exécution parallèle des agents
- Tableaux de bord en temps réel pour la surveillance des sessions

## Rôles des agents

| Agent | Responsabilité |
|---|---|
| oma-brainstorm | Idéation axée design et exploration de concepts |
| oma-db | Modélisation de bases de données, conception de schémas et optimisation de requêtes |
| oma-dev-workflow | Optimisation des workflows de développement et CI/CD |
| oma-tf-infra | Provisionnement d'infrastructure as code avec Terraform |
| oma-translator | Traduction multilingue contextuelle |
| oma-coordination | Coordonne les projets complexes multi-domaines |
| oma-pm | Planification et décomposition architecturale |
| oma-frontend | Implémentation React/Next.js |
| oma-backend | Implémentation API/base de données/authentification |
| oma-mobile | Implémentation Flutter/mobile |
| oma-qa | Revue sécurité/performance/accessibilité |
| oma-debug | Analyse des causes racines et correctifs sans régression |
| oma-orchestrator | Orchestration de sous-agents via CLI |
| oma-commit | Workflow de commit conventionnel |

## Structure du projet

- `.agents/skills/` : définitions des skills et ressources
- `.agents/workflows/` : commandes de workflow explicites
- `.serena/memories/` : état d'orchestration en temps réel
- `cli/cli.ts` : source de vérité pour les interfaces de commande

## Divulgation progressive

1. Identifier l'intention de la requête
2. Charger uniquement les ressources de skill nécessaires
3. Exécuter avec des agents spécialisés
4. Vérifier et itérer via les boucles QA/debug
