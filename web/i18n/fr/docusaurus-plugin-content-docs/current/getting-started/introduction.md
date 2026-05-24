---
title: Introduction
description: Une vue d'ensemble complète d'oh-my-agent — le framework d'orchestration multi-agents qui transforme les assistants de codage IA en équipes d'ingénierie spécialisées avec 21 agents de domaine, chargement progressif des compétences et portabilité entre IDE.
---

# Introduction

oh-my-agent est un framework d'orchestration multi-agents pour les IDE et outils CLI propulsés par l'IA. Au lieu de dépendre d'un seul assistant IA pour tout, oh-my-agent répartit le travail entre 21 agents spécialisés -- chacun modelé d'après un rôle réel d'une équipe d'ingénierie, avec ses propres connaissances de stack technique, protocoles d'exécution, guides de résolution d'erreurs et checklists de qualité.

L'ensemble du système réside dans un répertoire portable `.agents/` à l'intérieur de votre projet. Basculez entre Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor ou tout autre outil supporté -- votre configuration d'agents voyage avec votre code.

---

## Le paradigme multi-agents

Les assistants de codage IA traditionnels fonctionnent comme des généralistes. Ils gèrent le frontend, le backend, les bases de données, la sécurité et l'infrastructure avec le même contexte de prompt et le même niveau d'expertise. Cela entraîne :

- **Dilution du contexte** -- charger les connaissances de chaque domaine gaspille la fenêtre de contexte
- **Qualité inconstante** -- un généraliste ne peut pas égaler un spécialiste dans un domaine donné
- **Pas de coordination** -- les fonctionnalités complexes couvrant plusieurs domaines sont traitées séquentiellement

oh-my-agent résout cela par la spécialisation :

1. **Chaque agent maîtrise un domaine en profondeur.** L'agent frontend connaît React/Next.js, shadcn/ui, TailwindCSS v4, l'architecture FSD-lite. L'agent backend connaît le pattern Repository-Service-Router, les requêtes paramétrées, l'authentification JWT. Ils ne se chevauchent pas.

2. **Les agents s'exécutent en parallèle.** Pendant que l'agent backend construit votre API, l'agent frontend crée déjà l'interface utilisateur. L'orchestrateur coordonne via la mémoire partagée.

3. **La qualité est intégrée.** Chaque agent dispose d'une checklist spécifique au domaine et d'un guide de résolution d'erreurs. La vérification préalable du charter détecte la dérive du périmètre avant l'écriture du code. La revue QA est une étape de premier ordre, pas une réflexion après coup.

---

## Les 21 agents

### Idéation, architecture et planification

| Agent | Rôle | Capacités clés |
|-------|------|-----------------|
| **oma-brainstorm** | Idéation axée sur le design | Explore l'intention utilisateur, propose 2 à 3 approches avec analyse des compromis, produit des documents de conception avant toute écriture de code. Workflow en 6 phases : Contexte, Questions, Approches, Design, Documentation, Transition vers `/plan`. |
| **oma-architecture** | Spécialiste de l'architecture système | Frontières module/service/propriété, analyse des compromis, synthèse des parties prenantes. Méthodologies : routage diagnostique, comparaison design-twice, analyse de risque façon ATAM, priorisation façon CBAM, enregistrements de décisions façon ADR. Conscient des coûts par défaut. |
| **oma-pm** | Chef de produit | Décompose les exigences en tâches priorisées avec dépendances. Définit les contrats d'API. Produit `.agents/results/plan-{sessionId}.json` et `task-board.md`. Prend en charge les concepts ISO 21500, le cadrage des risques ISO 31000 et la gouvernance ISO 38500. |

### Implémentation

| Agent | Rôle | Stack technique et ressources |
|-------|------|----------------------|
| **oma-frontend** | Spécialiste UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, architecture FSD-lite. Bibliothèques : luxon (dates), ahooks (hooks), es-toolkit (utilitaires), Jotai (état client), TanStack Query (état serveur), @tanstack/react-form + Zod (formulaires), better-auth (authentification), nuqs (état d'URL). Ressources : `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | Spécialiste API et serveur | Architecture propre (Router-Service-Repository-Models). Agnostique au stack, détecte Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET depuis les manifestes du projet. JWT + bcrypt pour l'authentification. Ressources : `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Prend en charge `/stack-set` pour générer des références `stack/` spécifiques au langage. |
| **oma-mobile** | Mobile multiplateforme | Flutter, Dart, Riverpod/Bloc pour la gestion d'état, Dio avec intercepteurs pour les appels API, GoRouter pour la navigation. Architecture propre : domain-data-presentation. Material Design 3 (Android) + iOS HIG. Objectif 60 fps. Ressources : `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Architecture de bases de données | Modélisation SQL, NoSQL et bases de données vectorielles. Conception de schéma (3NF par défaut), normalisation, indexation, transactions, planification de capacité, stratégie de sauvegarde. Prend en charge la conception conforme ISO 27001/27002/22301. Ressources : `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Rôle | Capacités clés |
|-------|------|-----------------|
| **oma-design** | Spécialiste des systèmes de design | Crée DESIGN.md avec tokens, typographie, systèmes de couleurs, motion design (motion/react, GSAP, Three.js), mises en page responsive-first, conformité WCAG 2.2. Workflow en 7 phases : Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Applique les anti-patterns (pas d'« AI slop »). Intégration Stitch MCP optionnelle. Ressources : `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, ainsi qu'un répertoire `reference/` avec des guides sur la typographie, la couleur, le spatial, le motion, le responsive, les composants, l'accessibilité et les shaders. |

### Infrastructure, DevOps et observabilité

| Agent | Rôle | Capacités clés |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | Terraform multi-cloud (AWS, GCP, Azure, Oracle Cloud). Authentification OIDC en priorité, IAM au moindre privilège, policy-as-code (OPA/Sentinel), optimisation des coûts. Prend en charge les contrôles IA ISO/IEC 42001, la continuité ISO 22301, la documentation d'architecture ISO/IEC/IEEE 42010. Ressources : `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automatisation des tâches monorepo | Task runner mise, pipelines CI/CD, migrations de base de données, coordination des releases, git hooks, validation pre-commit. Ressources : `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | Routeur d'observabilité basé sur l'intention | Couverture des signaux MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), réglage du transport (UDP/MTU, OTLP gRPC vs HTTP, topologie du Collector, sampling), propagation W3C Trace Context, gestion des SLO et alertes burn-rate, investigation d'incidents (localisation en 6 dimensions), méta-observabilité (santé propre, synchro d'horloge, cardinalité, rétention). CNCF-first ; Fluentd déprécié (utiliser Fluent Bit ou OTel Collector). |

### Qualité et débogage

| Agent | Rôle | Capacités clés |
|-------|------|-----------------|
| **oma-qa** | Assurance qualité | Audit de sécurité (OWASP Top 10), analyse de performance, accessibilité (WCAG 2.1 AA), revue de qualité du code. Sévérités : CRITICAL/HIGH/MEDIUM/LOW avec fichier:ligne et code de remédiation. Prend en charge les caractéristiques qualité ISO/IEC 25010 et l'alignement des tests ISO/IEC 29119. Ressources : `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Diagnostic et correction de bugs | Méthodologie « reproduire d'abord ». Analyse de cause profonde, corrections minimales, tests de régression obligatoires, scan de motifs similaires. Utilise Serena MCP pour le traçage de symboles. Ressources : `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Localisation, coordination et Git

| Agent | Rôle | Capacités clés |
|-------|------|-----------------|
| **oma-translator** | Traduction contextuelle | Méthode de traduction en 4 étapes : Analyser la source, Extraire le sens, Reconstruire dans la langue cible, Vérifier. Préserve le ton, le registre et la terminologie de domaine. Détection d'anti-patterns IA. Prend en charge la traduction par lots (fichiers i18n). Mode affiné en 7 étapes optionnel pour la qualité de publication. Ressources : `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Coordinateur multi-agents automatisé | Lance des sous-agents CLI en parallèle, coordonne via la mémoire MCP, surveille la progression, exécute des boucles de vérification. Configurable : MAX_PARALLEL (3 par défaut), MAX_RETRIES (2 par défaut), POLL_INTERVAL (30 s par défaut). Inclut une boucle de revue inter-agents et la surveillance de la Dette de clarification. Ressources : `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Conventional commits | Analyse les modifications, détermine le type et le périmètre, découpe par fonctionnalité au besoin, génère des messages de commit au format Conventional Commits. Co-Author : `First Fluke <our.first.fluke@gmail.com>`. |

### Recherche, rétrospective et traitement de documents

| Agent | Rôle | Capacités clés |
|-------|------|-----------------|
| **oma-search** | Routeur de recherche basé sur l'intention | Achemine les requêtes vers Context7 (documents), la recherche web native, `gh`/`glab` (code), Serena (local). Scoring de confiance de domaine sur tous les résultats non locaux. Routage fail-forward (docs→web→fetch). Flags : `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Rétrospective de travail inter-outils | Analyse les historiques de conversation depuis Claude, Codex, Qwen et Cursor. Résout les saisies de date ou de fenêtre en langage naturel, regroupe par outil et session, extrait les thèmes, rend des résumés quotidiens ou périodiques pour les standups, rétros hebdomadaires et journaux de travail. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Conversion de documents Hangul (traitement de texte coréen) via `bunx kordoc@latest`. Préserve les titres, tableaux (y compris imbriqués), notes de bas de page, hyperliens, images. Supprime les caractères de la zone Private Use Area Hancom via le post-processeur `flatten-tables.ts`. |
| **oma-pdf** | PDF → Markdown | Conversion de documents PDF via `uvx opendataloader-pdf`. Préserve les titres, tableaux, listes, images ; mode hybride OCR pour les PDF scannés ; sortie normalisée avec `uvx mdformat`. |

---

## Modèle de divulgation progressive

oh-my-agent utilise une architecture de compétences en deux couches pour éviter l'épuisement de la fenêtre de contexte :

**Couche 1 -- SKILL.md (~800 octets, toujours chargée) :**
Contient l'identité de l'agent, les conditions de routage, les règles fondamentales et les indications « quand utiliser / quand NE PAS utiliser ». C'est tout ce qui est chargé lorsque l'agent n'est pas activement au travail.

**Couche 2 -- resources/ (chargement à la demande) :**
Contient les protocoles d'exécution, les références de stack technique, les extraits de code, les guides de résolution d'erreurs, les checklists et les exemples. Ceux-ci ne sont chargés que lorsque l'agent est invoqué pour une tâche, et même dans ce cas, seules les ressources pertinentes pour le type de tâche spécifique sont chargées (selon l'évaluation de la difficulté et le mapping tâche-ressource dans `context-loading.md`).

Cette conception économise environ 75 % des tokens par rapport au chargement intégral initial. Pour les modèles de niveau flash (contexte de 128 Ko), le budget total de ressources est d'environ 3 100 tokens -- soit seulement 2,4 % de la fenêtre de contexte.

---

## .agents/ -- La source unique de vérité (SSOT)

Tout ce dont oh-my-agent a besoin réside dans le répertoire `.agents/` :

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 22 répertoires de compétences (21 agents + _shared)
│   ├── _shared/            # Ressources centrales utilisées par tous les agents
│   └── oma-{agent}/        # SKILL.md + resources/ par agent
├── workflows/              # 16 définitions de workflows
├── agents/                 # 9 définitions de sous-agents
├── results/plan-{sessionId}.json               # Sortie du plan généré
├── state/                  # Fichiers d'état des workflows actifs
├── results/                # Fichiers de résultats des agents
└── mcp.json                # Configuration du serveur MCP
```

Le répertoire `.claude/` n'existe que comme couche d'intégration IDE -- il contient des symlinks pointant vers `.agents/`, ainsi que des hooks pour la détection de mots-clés et la barre de statut HUD. Le répertoire `.serena/memories/` contient l'état d'exécution pendant les sessions d'orchestration.

Cette architecture signifie que votre configuration d'agents est :
- **Portable** -- basculez entre IDE sans reconfigurer
- **Versionnée** -- commitez `.agents/` avec votre code
- **Partageable** -- les membres de l'équipe obtiennent la même configuration d'agents

---

## IDE et outils CLI supportés

oh-my-agent fonctionne avec tout IDE ou CLI propulsé par l'IA qui supporte le chargement de compétences/prompts :

| Outil | Méthode d'intégration | Agents parallèles |
|------|-------------------|----------------|
| **Claude Code** | Compétences natives + outil Agent | Outil Task pour un parallélisme réel |
| **Gemini CLI** | Compétences chargées automatiquement depuis `.agents/skills/` | `oma agent:spawn` |
| **Codex CLI** | Compétences chargées automatiquement | Requêtes parallèles arbitrées par le modèle |
| **Antigravity IDE** | Compétences chargées automatiquement | `oma agent:spawn` |
| **Cursor** | Compétences via l'intégration `.cursor/` | Lancement manuel |
| **OpenCode** | Chargement des compétences | Lancement manuel |

Le lancement d'agents s'adapte automatiquement à chaque fournisseur via le protocole de détection du fournisseur, qui vérifie les marqueurs spécifiques au fournisseur (ex. : l'outil `Agent` pour Claude Code, `apply_patch` pour Codex CLI).

---

## Système de routage des compétences

Lorsque vous envoyez un prompt, oh-my-agent détermine quel agent le traite grâce à la carte de routage des compétences (`.agents/skills/_shared/core/skill-routing.md`) :

| Mots-clés du domaine | Acheminé vers |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

Pour les requêtes complexes qui couvrent plusieurs domaines, le routage suit des ordres d'exécution établis. Par exemple, « Create a fullstack app » est acheminé vers : oma-pm (planification), puis oma-backend + oma-frontend (implémentation parallèle), puis oma-qa (revue).

---

## Barre d'état HUD

Lorsqu'il s'exécute dans Claude Code, oh-my-agent affiche un indicateur d'état persistant `[OMA]` dans la barre d'état, qui montre :
- Le nom du modèle (par exemple Opus, Sonnet)
- L'utilisation du contexte avec un code couleur (vert &lt; 70 %, jaune 70-85 %, rouge &gt; 85 %)
- L'état du workflow actif (si un workflow persistant est en cours)

Le HUD est alimenté par `.claude/hooks/hud.ts` via la fonctionnalité `statusLine` de Claude Code.

---

## Détection automatique des workflows

Vous n'avez pas besoin de taper `/command` pour déclencher un workflow. Le hook `UserPromptSubmit` de oh-my-agent analyse votre saisie en langage naturel à partir des déclencheurs définis dans `.claude/hooks/triggers.json`, et prend en charge 11 langues (anglais, coréen, japonais, chinois, espagnol, français, allemand, portugais, russe, néerlandais, polonais).

- **Saisie actionnable** (par exemple « plan the auth feature ») → charge automatiquement le workflow
- **Saisie informationnelle** (par exemple « what is orchestrate? ») → filtrée, aucun workflow déclenché
- **`/command` explicite** → le hook ignore la détection pour éviter les doublons
- **Workflows persistants** → le contexte est réinjecté à chaque message jusqu'à ce que vous disiez « workflow done »

---

## Prise en charge multi-fournisseurs

oh-my-agent ne se limite pas à Claude Code. Le système de hooks prend en charge :

| Fournisseur | Intégration |
|-------------|-------------|
| **Claude Code** | Hooks natifs (`UserPromptSubmit`, `Notification`, `statusLine`) |
| **Gemini CLI** | Compétences chargées automatiquement depuis `.agents/skills/`, spawn d'agents via `oma agent:spawn` |
| **Codex CLI** | Compétences chargées automatiquement, requêtes parallèles arbitrées par le modèle |
| **Qwen Code** | Hooks pris en charge pour la détection de workflows |

La détection du fournisseur est automatique : les agents adaptent leur méthode de spawn en fonction de l'environnement d'exécution détecté.

---

## Et ensuite

- **[Installation](./installation.md)** -- Trois méthodes d'installation, presets, configuration CLI et vérification
- **[Agents](/docs/core-concepts/agents)** -- Plongée approfondie dans les 21 agents et la vérification préalable du charter
- **[Compétences](/docs/core-concepts/skills)** -- L'architecture en deux couches expliquée
- **[Workflows](/docs/core-concepts/workflows)** -- Les 16 workflows avec déclencheurs et phases
- **[Guide d'utilisation](/docs/guide/usage)** -- Exemples concrets, de la tâche simple à l'orchestration complète
