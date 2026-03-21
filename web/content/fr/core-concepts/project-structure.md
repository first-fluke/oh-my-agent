---
title: Structure du Projet
description: Arborescence mise à jour après la séparation des workspaces CLI et docs web.
---

# Structure du projet

Arborescence détaillée des répertoires pour ce dépôt.

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml   # Langue, fuseau horaire, mappage CLI
│   ├── workflows/
│   │   ├── brainstorm.md           # /brainstorm (idéation et exploration de concepts)
│   │   ├── coordinate.md           # /coordinate (orchestration multi-agents via UI)
│   │   ├── deepinit.md             # /deepinit (initialisation profonde du projet)
│   │   ├── exec-plan.md            # /exec-plan (exécution et gestion de plan)
│   │   ├── orchestrate.md          # /orchestrate (exécution parallèle CLI automatisée)
│   │   ├── plan.md                 # /plan (décomposition tâches PM)
│   │   ├── review.md               # /review (pipeline QA complet)
│   │   ├── debug.md                # /debug (correction bugs structurée)
│   │   ├── setup.md                # /setup (configuration CLI & MCP)
│   │   ├── tools.md                # /tools (gestion outils MCP)
│   │   └── ultrawork.md            # /ultrawork (exécution maximale parallèle)
│   └── skills/
│       ├── _shared/                    # Ressources communes (pas une compétence)
│       │   ├── serena-memory-protocol.md
│       │   ├── common-checklist.md
│       │   ├── skill-routing.md
│       │   ├── context-loading.md
│       │   ├── context-budget.md
│       │   ├── reasoning-templates.md
│       │   ├── clarification-protocol.md
│       │   ├── difficulty-guide.md
│       │   ├── lessons-learned.md
│       │   ├── verify.sh
│       │   └── api-contracts/
│       ├── oma-backend/              # FastAPI
│       ├── oma-brainstorm/                 # Idéation et exploration de concepts
│       ├── oma-commit/                     # Compétence commits conventionnels
│       ├── oma-db/                   # Base de données, schémas, requêtes
│       ├── oma-debug/                # Correction bugs
│       ├── oma-dev-workflow/               # Workflows de développement et CI/CD
│       ├── oma-frontend/             # React/Next.js
│       ├── oma-mobile/               # Flutter
│       ├── oma-orchestrator/               # Générateur sous-agents basé CLI
│       ├── oma-pm/                   # Chef de projet
│       ├── oma-qa/                   # Sécurité & QA
│       ├── oma-tf-infra/             # Infrastructure as code Terraform
│       ├── oma-translator/                 # Traduction multilingue
│       └── oma-coordination/             # Coordination multi-agents
│       # Chaque compétence contient :
│       #   SKILL.md              (~40 lignes, optimisé tokens)
│       #   resources/
│       #     ├── execution-protocol.md  (étapes chaîne de pensée)
│       #     ├── examples.md            (entrée/sortie few-shot)
│       #     ├── checklist.md           (auto-vérification)
│       #     ├── error-playbook.md      (récupération échec)
│       #     ├── tech-stack.md          (spécifications tech détaillées)
│       #     └── snippets.md            (modèles copier-coller)
├── .serena/
│   └── memories/                   # État d'exécution (gitignored)
├── package.json
├── docs/
│   ├── USAGE.md                    # Guide utilisation détaillé (Anglais)
│   ├── USAGE.ko.md                 # Guide utilisation détaillé (Coréen)
│   ├── project-structure.md        # Référence structure complète (Anglais)
│   └── project-structure.ko.md     # Référence structure complète (Coréen)
├── README.md                       # Ce fichier (Anglais)
└── README.ko.md                    # Guide coréen
```
