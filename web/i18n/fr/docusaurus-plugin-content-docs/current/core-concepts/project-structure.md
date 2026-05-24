---
title: Structure du Projet
description: Arborescence exhaustive d'une installation oh-my-agent avec chaque fichier et répertoire expliqué — .agents/, .claude/, .serena/memories/, et la structure du dépôt source oh-my-agent.
---

# Structure du Projet

Après l'installation d'oh-my-agent, votre projet acquiert trois arborescences de répertoires : `.agents/` (la source unique de vérité), `.claude/` (couche d'intégration IDE) et `.serena/` (état d'exécution). Cette page documente chaque fichier et son rôle.

---

## Arborescence complète

```
your-project/
├── .agents/                          ← Source unique de vérité (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← Langue, fuseau horaire, mapping CLI
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Ressources utilisées par TOUS les agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 ← Généré par /stack-set
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       ├── screen-template.dart
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   ├── reference/
│   │   │   │   ├── typography.md
│   │   │   │   ├── color-and-contrast.md
│   │   │   │   ├── spatial-design.md
│   │   │   │   ├── motion-design.md
│   │   │   │   ├── responsive-design.md
│   │   │   │   ├── component-patterns.md
│   │   │   │   ├── accessibility.md
│   │   │   │   └── shader-and-3d.md
│   │   │   └── examples/
│   │   │       ├── design-context-example.md
│   │   │       └── landing-page-prompt.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translator/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       └── anti-ai-patterns.md
│   │   │
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← Persistant : exécution parallèle automatisée
│   │   ├── work.md             ← Persistant : coordination étape par étape
│   │   ├── ultrawork.md              ← Persistant : workflow qualité en 5 phases
│   │   ├── plan.md                   ← Découpage des tâches par le PM
│   │   ├── exec-plan.md              ← Gestion des plans d'exécution
│   │   ├── brainstorm.md             ← Idéation axée sur le design
│   │   ├── deepinit.md               ← Initialisation de projet
│   │   ├── review.md                 ← Pipeline de revue QA
│   │   ├── debug.md                  ← Débogage structuré
│   │   ├── design.md                 ← Workflow de design en 7 phases
│   │   ├── scm.md                 ← Conventional commits
│   │   ├── tools.md                  ← Gestion des outils MCP
│   │   └── stack-set.md              ← Configuration du stack technique
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← Définition de sous-agent : backend
│   │   ├── frontend-engineer.md       ← Définition de sous-agent : frontend
│   │   ├── mobile-engineer.md         ← Définition de sous-agent : mobile
│   │   ├── db-engineer.md             ← Définition de sous-agent : base de données
│   │   ├── qa-reviewer.md             ← Définition de sous-agent : QA
│   │   ├── debug-investigator.md      ← Définition de sous-agent : debug
│   │   └── pm-planner.md             ← Définition de sous-agent : PM
│   │
│   ├── results/plan-{sessionId}.json                      ← Sortie du plan généré (renseigné par /plan)
│   ├── state/                         ← Fichiers d'état des workflows actifs
│   │   ├── orchestrate-state.json     ← (n'existe que lorsque le workflow est actif)
│   │   ├── ultrawork-state.json
│   │   └── work-state.json
│   ├── results/                       ← Fichiers de résultats des agents
│   │   └── result-{agent}.md          ← (créé par les agents terminés)
│   └── mcp.json                       ← Configuration du serveur MCP
│
├── .claude/                           ← Couche d'intégration IDE
│   ├── settings.json                  ← Enregistrement des hooks et permissions
│   ├── hooks/
│   │   ├── triggers.json              ← Mapping mot-clé/workflow (11 langues)
│   │   ├── keyword-detector.ts        ← Logique de détection automatique
│   │   ├── persistent-mode.ts         ← Application du workflow persistant
│   │   └── hud.ts                     ← Indicateur de barre d'état [OMA]
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Définitions de sous-agents pour Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← État d'exécution (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    ← Identifiant de session, statut, suivi de phase
        ├── task-board.md              ← Attribution des tâches et statut
        ├── progress-{agent}.md        ← Mises à jour de progression par agent
        ├── result-{agent}.md          ← Sortie finale par agent
        ├── session-metrics.md         ← Suivi de la Dette de clarification et du Quality Score
        ├── experiment-ledger.md       ← Suivi des expériences (conditionnel)
        ├── session-work.md      ← État de session du workflow work
        ├── session-ultrawork.md       ← État de session du workflow ultrawork
        ├── tool-overrides.md          ← Restrictions temporaires d'outils (/tools --temp)
        └── archive/
            └── metrics-{date}.md      ← Métriques de session archivées
```

---

## .agents/ -- La source de vérité

C'est le répertoire central. Tout ce dont les agents ont besoin s'y trouve. C'est le seul répertoire qui compte pour le comportement des agents -- tous les autres répertoires en sont dérivés.

### config/

**`oma-config.yaml`** — Fichier de configuration central avec :
- `language` : code de langue de réponse (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format` : chaîne de format d'horodatage (par défaut `YYYY-MM-DD`)
- `timezone` : identifiant de fuseau horaire (par défaut `UTC`)
- `default_cli` : fournisseur CLI de repli (antigravity, claude, codex, qwen)
- `model_preset (per-agent overrides via `agents:`)` : surcharges de routage CLI par agent

### skills/

L'expertise des agents y réside. 22 répertoires au total : 21 compétences d'agents + 1 répertoire de ressources partagées.

**`_shared/`** — Ressources utilisées par tous les agents :
- `core/` — routage, chargement du contexte, structure des prompts, protocole de clarification, budget de contexte, évaluation de difficulté, modèles de raisonnement, principes qualité, détection du fournisseur, métriques de session, checklist commune, enseignements, modèles de contrats d'API
- `runtime/` — protocole de mémoire pour sous-agents CLI, protocoles d'exécution spécifiques au fournisseur (claude, codex, qwen)
- `conditional/` — mesure du quality score, suivi du registre d'expériences, protocole de boucle d'exploration (chargés uniquement sur déclenchement)

**`oma-{agent}/`** — Répertoires de compétences par agent. Chacun contient :
- `SKILL.md` (~800 octets) — Couche 1 : toujours chargée. Identité, routage, règles fondamentales.
- `resources/` — Couche 2 : à la demande. Protocoles d'exécution, exemples, checklists, error playbooks, stacks techniques, snippets, templates.
- Certains agents disposent de sous-répertoires additionnels : `stack/` (oma-backend, généré par /stack-set), `reference/` (oma-design), `examples/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm).

### workflows/

16 fichiers Markdown définissant le comportement des commandes slash. Chaque fichier contient :
- Frontmatter YAML avec `description`
- Section de règles obligatoires (langue de réponse, ordre des étapes, prérequis d'outils MCP)
- Instructions de détection du fournisseur
- Protocole d'exécution étape par étape
- Définitions des portes (pour les workflows persistants)

Workflows persistants : `orchestrate.md`, `work.md`, `ultrawork.md`.
Non persistants : `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

7 fichiers de définition de sous-agents utilisés lors du lancement d'agents via l'outil Task (Claude Code) ou CLI. Chaque fichier définit :
- Frontmatter : `name`, `description`, `skills` (compétence à charger)
- Référence au protocole d'exécution
- Modèle de vérification préalable du charter (CHARTER_CHECK)
- Résumé de l'architecture
- Règles spécifiques au domaine (10 règles)
- Mention : « Ne jamais modifier les fichiers `.agents/` »

### plan-\{sessionId\}.json

Généré par le workflow `/plan`. Contient le découpage structuré des tâches avec affectations d'agents, priorités, dépendances et critères d'acceptation. Consommé par `/orchestrate`, `/work` et `/exec-plan`.

### state/

Fichiers d'état des workflows persistants actifs. Ces fichiers JSON n'existent que pendant l'exécution d'un workflow persistant. Les supprimer (ou dire « workflow done ») désactive le workflow.

### results/

Fichiers de résultats d'agents. Créés par les agents terminés avec statut (completed/failed), résumé, fichiers modifiés et checklist des critères d'acceptation. Lus par l'orchestrateur lors de la collecte et par les tableaux de bord pour la surveillance.

### mcp.json

Configuration du serveur MCP, comprenant :
- Définitions de serveurs (Serena, etc.)
- Configuration de la mémoire : `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (noms d'outils read/write/edit)
- Définitions des groupes d'outils pour la gestion via `/tools`

---

## .claude/ -- Intégration IDE

Ce répertoire connecte oh-my-agent à Claude Code et aux autres IDE.

### settings.json

Enregistre les hooks et permissions pour Claude Code. Contient les références aux scripts de hook et à leurs conditions de déclenchement (par exemple `UserPromptSubmit`).

### hooks/

**`triggers.json`** — Le mapping mot-clé/workflow. Définit :
- `workflows` : Mapping du nom de workflow vers `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`. Les `keywords` sont des phrases littérales ; les `patterns` sont des chaînes regex brutes (compilées avec les drapeaux `iu`).
- `informationalPatterns` : Phrases qui indiquent des questions (filtrées de la détection automatique)
- `excludedWorkflows` : Workflows qui nécessitent une invocation explicite via `/command`
- `cjkScripts` : Codes de langues utilisant les écritures CJK (ko, ja, zh)

Les sections par langue dans `keywords`, `patterns` et `informationalPatterns` suivent cette convention :
- `*` — Universel/Anglais. Toujours chargé indépendamment du paramètre `language` dans `.agents/oma-config.yaml`.
- `en` — Chargé pour la rétrocompatibilité. Fonctionnellement équivalent à `*`. Le nouveau contenu en anglais doit aller dans `*`.
- `ko`/`ja`/`zh`/etc. — Spécifique à une langue. Chargé uniquement lorsque `language: <code>` est défini dans `.agents/oma-config.yaml`.

**`keyword-detector.ts`** — Hook TypeScript qui :
1. Assainit l'entrée (supprime les blocs de code, les chaînes entre guillemets, les blocs d'écho système collés)
2. Scanne l'entrée nettoyée par rapport aux `keywords` de déclenchement (littéraux) et aux `patterns` (regex)
3. Vérifie les patterns informationnels dans une fenêtre de 60 caractères autour de chaque correspondance
4. Applique le garde-fou de renforcement (supprime si le même workflow s'est déclenché 2 fois ou plus en 60 s)
5. Injecte `[OMA WORKFLOW: ...]` ou `[OMA PERSISTENT MODE: ...]` dans le contexte

**`persistent-mode.ts`** — Vérifie les fichiers d'état actifs dans `.agents/state/` et applique l'exécution des workflows persistants.

**`hud.ts`** — Affiche l'indicateur `[OMA]` dans la barre d'état : nom du modèle, utilisation du contexte (codé couleur vert/jaune/rouge) et état du workflow actif.

### skills/

Symlinks pointant vers `.agents/skills/`. Cela rend les compétences visibles aux IDE qui lisent depuis `.claude/skills/`, tout en gardant `.agents/` comme source unique de vérité.

### agents/

Définitions de sous-agents formatées pour l'outil Agent de Claude Code. Elles référencent les fichiers de compétences et incluent le modèle CHARTER_CHECK.

---

## .serena/memories/ -- État d'exécution

L'endroit où les agents écrivent leur progression pendant les sessions d'orchestration. Ce répertoire est surveillé par les tableaux de bord pour les mises à jour en temps réel.

| File | Propriétaire | Objet |
|------|-------|---------|
| `orchestrator-session.md` | Orchestrateur | Métadonnées de session : ID, statut, heure de début, phase courante |
| `task-board.md` | Orchestrateur | Attribution des tâches : agent, tâche, priorité, statut, dépendances |
| `progress-{agent}.md` | L'agent concerné | Mises à jour tour par tour : actions effectuées, fichiers lus/modifiés, statut courant |
| `result-{agent}.md` | L'agent concerné | Sortie finale : statut d'achèvement, résumé, fichiers modifiés, critères d'acceptation |
| `session-metrics.md` | Orchestrateur | Événements de Dette de clarification, progression du Quality Score |
| `experiment-ledger.md` | Orchestrateur/QA | Lignes d'expérience lorsque le Quality Score est actif |
| `session-work.md` | Workflow work | État de session propre au workflow work |
| `session-ultrawork.md` | Workflow ultrawork | Suivi de phase propre au workflow ultrawork |
| `tool-overrides.md` | Workflow /tools | Restrictions temporaires d'outils (portée session) |
| `archive/metrics-{date}.md` | Système | Métriques de session archivées (rétention 30 jours) |

Memory file paths and tool names are configurable in `.agents/mcp.json` via `memoryConfig`.

---

## Structure du dépôt source oh-my-agent

Si vous travaillez sur oh-my-agent lui-même (et pas seulement en tant qu'utilisateur), le dépôt est un monorepo :

```
oh-my-agent/
├── cli/                  ← Source de l'outil CLI (TypeScript, build via bun)
│   ├── src/              ← Code source
│   ├── package.json
│   └── install.sh        ← Installateur bootstrap
├── web/                  ← Site de documentation (Next.js)
│   └── content/
│       └── en/           ← Pages de documentation en anglais
├── action/               ← GitHub Action pour les mises à jour automatisées de compétences
├── docs/                 ← READMEs traduits et spécifications
├── .agents/              ← MODIFIABLE dans le dépôt source (c'est ICI la source)
├── .claude/              ← Intégration IDE
├── .serena/              ← État d'exécution de développement
├── CLAUDE.md             ← Instructions de projet pour Claude Code
└── package.json          ← Configuration de workspace racine
```

Dans le dépôt source, les modifications de `.agents/` sont autorisées (c'est l'exception SSOT pour le dépôt source lui-même). Les règles de `.agents/` interdisant la modification de ce répertoire s'appliquent aux projets consommateurs, pas au dépôt oh-my-agent.

Commandes de développement :
- `bun run test` — tests CLI (vitest)
- `bun run lint` — analyse statique
- `bun run build` — build du CLI
- Les commits doivent suivre le format conventional commit (appliqué par commitlint)
