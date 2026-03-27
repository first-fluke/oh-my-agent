---
title: Introduction
description: Une vue d'ensemble complète d'oh-my-agent — le framework d'orchestration multi-agents qui transforme les assistants de codage IA en équipes d'ingénierie spécialisées avec 14 agents de domaine, chargement progressif des compétences et portabilité entre IDE.
---

# Introduction

oh-my-agent est un framework d'orchestration multi-agents pour les IDE et outils CLI propulsés par l'IA. Au lieu de dépendre d'un seul assistant IA pour tout, oh-my-agent répartit le travail entre 14 agents spécialisés -- chacun modelé d'après un rôle réel d'une équipe d'ingénierie, avec ses propres connaissances de stack technique, protocoles d'exécution, guides de résolution d'erreurs et checklists de qualité.

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

## Les 14 agents

### Idéation et planification

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-brainstorm** | Design-first ideation | Explores user intent, proposes 2-3 approaches with trade-off analysis, produces design documents before any code is written. 6-phase workflow: Context, Questions, Approaches, Design, Documentation, Transition to `/plan`. |
| **oma-pm** | Product manager | Decomposes requirements into prioritized tasks with dependencies. Defines API contracts. Outputs `.agents/plan.json` and `task-board.md`. Supports ISO 21500 concepts, ISO 31000 risk framing, ISO 38500 governance. |

### Implémentation

| Agent | Role | Tech Stack & Resources |
|-------|------|----------------------|
| **oma-frontend** | UI/UX specialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite architecture. Libraries: luxon (dates), ahooks (hooks), es-toolkit (utils), Jotai (client state), TanStack Query (server state), @tanstack/react-form + Zod (forms), better-auth (auth), nuqs (URL state). Resources: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | API & server specialist | Clean architecture (Router-Service-Repository-Models). Stack-agnostic — detects Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET from project manifests. JWT + bcrypt for auth. Resources: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Supports `/stack-set` for generating language-specific `stack/` references. |
| **oma-mobile** | Cross-platform mobile | Flutter, Dart, Riverpod/Bloc for state management, Dio with interceptors for API calls, GoRouter for navigation. Clean architecture: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps target. Resources: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Database architecture | SQL, NoSQL, and vector database modeling. Schema design (3NF default), normalization, indexing, transactions, capacity planning, backup strategy. Supports ISO 27001/27002/22301-aware design. Resources: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-design** | Design system specialist | Creates DESIGN.md with tokens, typography, color systems, motion design (motion/react, GSAP, Three.js), responsive-first layouts, WCAG 2.2 compliance. 7-phase workflow: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Enforces anti-patterns (no "AI slop"). Optional Stitch MCP integration. Resources: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, plus `reference/` directory with typography, color, spatial, motion, responsive, component, accessibility, and shader guides. |

### Infrastructure et DevOps

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | Multi-cloud Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first auth, least privilege IAM, policy-as-code (OPA/Sentinel), cost optimization. Supports ISO/IEC 42001 AI controls, ISO 22301 continuity, ISO/IEC/IEEE 42010 architecture documentation. Resources: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Monorepo task automation | mise task runner, CI/CD pipelines, database migrations, release coordination, git hooks, pre-commit validation. Resources: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Qualité et débogage

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-qa** | Quality assurance | Security audit (OWASP Top 10), performance analysis, accessibility (WCAG 2.1 AA), code quality review. Severity: CRITICAL/HIGH/MEDIUM/LOW with file:line and remediation code. Supports ISO/IEC 25010 quality characteristics and ISO/IEC 29119 test alignment. Resources: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Bug diagnosis and fixing | Reproduce-first methodology. Root cause analysis, minimal fixes, mandatory regression tests, similar pattern scanning. Uses Serena MCP for symbol tracing. Resources: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Localisation, coordination et Git

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-translator** | Context-aware translation | 4-stage translation method: Analyze Source, Extract Meaning, Reconstruct in Target Language, Verify. Preserves tone, register, and domain terminology. Anti-AI pattern detection. Supports batch translation (i18n files). Optional 7-stage refined mode for publication quality. Resources: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Automated multi-agent coordinator | Spawns CLI subagents in parallel, coordinates via MCP memory, monitors progress, runs verification loops. Configurable: MAX_PARALLEL (default 3), MAX_RETRIES (default 2), POLL_INTERVAL (default 30s). Includes agent-to-agent review loop and Clarification Debt monitoring. Resources: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-commit** | Conventional commits | Analyzes changes, determines type/scope, splits by feature when appropriate, generates commit messages in Conventional Commits format. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

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
├── config/                 # user-preferences.yaml
├── skills/                 # 15 skill directories (14 agents + _shared)
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{agent}/        # Per-agent SKILL.md + resources/
├── workflows/              # 14 workflow definitions
├── agents/                 # 7 subagent definitions
├── plan.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

Le répertoire `.claude/` n'existe que comme couche d'intégration IDE -- il contient des symlinks pointant vers `.agents/`, ainsi que des hooks pour la détection de mots-clés et la barre de statut HUD. Le répertoire `.serena/memories/` contient l'état d'exécution pendant les sessions d'orchestration.

Cette architecture signifie que votre configuration d'agents est :
- **Portable** -- basculez entre IDE sans reconfigurer
- **Versionnée** -- commitez `.agents/` avec votre code
- **Partageable** -- les membres de l'équipe obtiennent la même configuration d'agents

---

## IDE et outils CLI supportés

oh-my-agent fonctionne avec tout IDE ou CLI propulsé par l'IA qui supporte le chargement de compétences/prompts :

| Tool | Integration Method | Parallel Agents |
|------|-------------------|----------------|
| **Claude Code** | Native skills + Agent tool | Task tool for true parallelism |
| **Gemini CLI** | Skills auto-loaded from `.agents/skills/` | `oh-my-ag agent:spawn` |
| **Codex CLI** | Skills auto-loaded | Model-mediated parallel requests |
| **Antigravity IDE** | Skills auto-loaded | `oh-my-ag agent:spawn` |
| **Cursor** | Skills via `.cursor/` integration | Manual spawning |
| **OpenCode** | Skills loading | Manual spawning |

Le lancement d'agents s'adapte automatiquement à chaque fournisseur via le protocole de détection du fournisseur, qui vérifie les marqueurs spécifiques au fournisseur (ex. : l'outil `Agent` pour Claude Code, `apply_patch` pour Codex CLI).

---

## Système de routage des compétences

Lorsque vous envoyez un prompt, oh-my-agent détermine quel agent le traite grâce à la carte de routage des compétences (`.agents/skills/_shared/core/skill-routing.md`) :

| Domain Keywords | Routed To |
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

Pour les requêtes complexes qui couvrent plusieurs domaines, le routage suit des ordres d'exécution établis. Par exemple, « Create a fullstack app » est routé vers : oma-pm (plan) puis oma-backend + oma-frontend (implémentation parallèle) puis oma-qa (revue).

---

## Et ensuite

- **[Installation](./installation)** -- Trois méthodes d'installation, presets, configuration CLI et vérification
- **[Agents](/core-concepts/agents)** -- Plongée approfondie dans les 14 agents et la vérification préalable du charter
- **[Compétences](/core-concepts/skills)** -- L'architecture en deux couches expliquée
- **[Workflows](/core-concepts/workflows)** -- Les 14 workflows avec déclencheurs et phases
- **[Guide d'utilisation](/guide/usage)** -- Exemples concrets, de la tâche simple à l'orchestration complète
