---
title: Structure du projet
sidebar_label: Structure du projet
description: Carte destinée aux lecteurs d'une installation oh-my-agent, couvrant la SSOT sous .agents/, les ressources représentatives des compétences, les workflows, les définitions d'agents versionnées, l'état du runtime, les couches d'intégration des fournisseurs et la structure du dépôt source.
---

# Structure du projet

Après l'installation d'oh-my-agent, votre projet comprend deux arborescences principales : `.agents/` (la source unique de vérité, y compris le magasin de coordination `.agents/state/memories/`) et les couches d'intégration du runtime (par exemple `.claude/`, `.cursor/`, `.codex/`). Si Serena est choisi comme fournisseur d'intelligence du code, un répertoire `.serena/` facultatif peut aussi exister pour les mémoires d'intégration de Serena. Cette page explique les fichiers partagés et les chemins facultatifs ou générés utiles au dépannage.

---

## Arborescence représentative {#representative-directory-tree}

L'arborescence ci-dessous détaille les ressources partagées et des compétences de domaine représentatives. Le catalogue actuel comprend 33 répertoires de compétences ; les compétences omises suivent le même modèle `SKILL.md` avec des répertoires facultatifs `resources/`, `variants/` ou propres à la compétence. Considérez l'arborescence `.agents/` active comme l'autorité lorsqu'un fichier généré ou facultatif est absent.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
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
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
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
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
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
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
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
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
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
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/ : la source de vérité {#.agents-the-source-of-truth}

C'est le répertoire central. Tout ce dont les agents ont besoin s'y trouve. C'est le seul répertoire qui compte pour le comportement des agents ; tous les autres sont dérivés de celui-ci.

### oma-config.cue et oma-config.yaml {#oma-configcue-and-oma-configyaml}

**`oma-config.yaml`** : fichier de configuration central contenant :
- `language` : code de langue des réponses (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format` : chaîne de format des horodatages (`ISO`, `US` ou `EU` ; valeur par défaut `ISO`)
- `timezone` : identifiant de fuseau horaire IANA ; une valeur omise utilise le fuseau horaire du système
- `model_preset` : clé du preset de modèle actif (`auto` par défaut, ou un preset fixe/personnalisé)
- `providers` : fournisseurs de capacités pour la documentation, le web, l'intelligence du code et la mémoire sémantique
- `auto_update_cli` : vérification des mises à jour en arrière-plan (valeur par défaut `true`, désactivez avec `false`)
- `telemetry` : activation de la télémétrie du fournisseur (valeur par défaut `false`)
- `mcp.devtools_browsers` : liste facultative de navigateurs ; une valeur absente conserve les entrées existantes
- `agents` : surcharges facultatives par agent (objet `AgentSpec` uniquement)
- `models` : slugs de modèles facultatifs définis par l'utilisateur
- `custom_presets` : presets facultatifs définis par l'utilisateur, avec `extends:` facultatif

### skills/ {#skills}

C'est ici que se trouve l'expertise des compétences. Le catalogue actuel comprend 33 répertoires de compétences et les ressources `_shared` ; le preset `all` est dérivé de cette arborescence active.

**`_shared/`** : ressources utilisées par tous les agents :
- `core/` : routage, chargement du contexte, structure des prompts, protocole de clarification, budget de contexte, évaluation de difficulté, modèles de raisonnement, principes de qualité, détection des fournisseurs, métriques de session, checklist commune, leçons apprises et modèles de contrats d'API
- `runtime/` : protocole de mémoire, spécification d'événements, contrat de résultat et protocoles d'exécution propres aux fournisseurs
- `conditional/` : mesure du score de qualité, suivi du registre d'expériences et protocole de boucle d'exploration (chargés uniquement lorsqu'ils sont déclenchés)

**`oma-{skill}/`** : répertoires propres aux compétences. Chacun contient :
- `SKILL.md` : couche 1, chargée lorsque la compétence est routée ; identité, routage et règles fondamentales
- `resources/` : couche 2, chargée à la demande ; protocoles d'exécution, exemples, checklists, guides de résolution d'erreurs, stacks techniques, extraits et modèles
- Certaines compétences ont d'autres sous-répertoires : `variants/` (graines backend/mobile), références `stack/` générées par `/stack-set`, `reference/` (`oma-design`) et des scripts ou configurations propres à la compétence.

### workflows/ {#workflows}

21 fichiers Markdown définissent le comportement des commandes slash. Chaque fichier contient :
- un frontmatter YAML avec `description`
- une section de règles obligatoires (langue des réponses, ordre des étapes, exigences des outils MCP)
- les instructions de détection du fournisseur
- un protocole d'exécution étape par étape
- les définitions de portes (pour les workflows persistants)

Workflows persistants : `orchestrate.md`, `work.md`, `ultrawork.md` et `ralph.md`.
Les workflows non persistants comprennent `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` et `video.md`.

### agents/ {#agents}

12 fichiers de définition de sous-agents utilisés lors du lancement d'agents avec l'outil Task (Claude Code) ou la CLI. Chaque fichier définit :
- le frontmatter : `name`, `description`, `skills` (compétence à charger)
- une référence au protocole d'exécution
- le modèle de charter preflight (`CHARTER_CHECK`)
- un résumé de l'architecture
- 10 règles propres au domaine
- la déclaration « Never modify `.agents/` files »

### plan-\{sessionId\}.json {#plan-sessionidjson}

Généré par le workflow `/plan`. Contient le découpage structuré de la tâche avec les affectations d'agents, les priorités, les dépendances et les critères d'acceptation. Consommé par `/orchestrate` et `/work`. Le suivi permanent lisible par les humains se trouve dans `docs/plans/work/{NNN}-{name}.md` (son cycle de vie est suivi par le champ `Status`). Les références de conception permanentes sont conservées dans `docs/plans/designs/{NNN}-{name}.md`.

### state/ {#state}

Fichiers d'état des workflows persistants. Ces fichiers JSON n'existent que pendant l'exécution d'un workflow persistant. Les supprimer (ou dire « workflow done ») désactive le workflow.

Le sous-répertoire `state/memories/` est le magasin canonique de mémoire de coordination : état de session de l'orchestrateur, tableau de tâches, progression et résultats par agent, métriques de session et télémétrie des coûts. C'est le chemin surveillé par les tableaux de bord et résolu en premier par la CLI (les anciens projets utilisent en repli l'emplacement historique `.serena/memories/`). Voir [`.agents/state/memories/` : état du runtime](#agentsstatememories-runtime-state) ci-dessous.

### results/ {#results}

Fichiers de résultats des agents. Les agents terminés les créent avec un statut (completed/failed), un résumé, les fichiers modifiés et la checklist des critères d'acceptation. L'orchestrateur les lit lors de la collecte et les tableaux de bord les utilisent pour le suivi.

### mcp.json {#mcpjson}

Configuration des serveurs MCP, notamment :
- les définitions des serveurs (Serena, etc.)
- la configuration de la mémoire : `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (noms des outils de lecture/écriture/édition)
- les définitions de groupes d'outils pour la gestion par `/tools`

---

## .claude/ : intégration IDE {#.claude-ide-integration}

Ce répertoire relie oh-my-agent à Claude Code et aux autres IDE.

### settings.json {#settingsjson}

Enregistre les hooks et les permissions pour Claude Code. Chaque entrée de hook utilise désormais l'ABI canonique `oma hook run` :

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

L'entrée `statusLine` conserve un chemin `bun` direct (affichage sur le chemin critique, non routé par `oma hook run`).

### hooks/ {#hooks}

Le répertoire `hooks/` d'un fournisseur contient **uniquement les fichiers exécutés ou lus par quelque chose dans ce répertoire au runtime**. La chaîne de handlers elle-même (détection des mots-clés, mode persistant, injection de compétences, …) s'exécute in-process dans le binaire `oma` via `oma hook run` ; les fichiers handler `.ts` sont intégrés à la CLI lors du build et ne sont PAS matérialisés dans les répertoires des fournisseurs.

**`oma-hook.sh`** : script wrapper généré par `oma link`/`oma install`/`oma update`. Chaque événement de hook fournisseur passe par ce fichier. Ordre de résolution au runtime : `$OMA_BIN` (surcharge explicite) → `command -v oma` (PATH) → répertoires d'installation connus tels que `$HOME/.bun/bin` et `$HOME/.local/share/mise/shims` (les agents lancés par une interface graphique héritent d'un PATH minimal) → `exit 0` (fail-open, ne bloque jamais l'agent). Le script ne contient aucune donnée propre à la machine ; il est donc identique octet par octet pour tous les développeurs et peut être versionné sans risque. Il transmet `"$@"` tel quel afin que les arguments `--vendor`, `--event` et `--matcher` atteignent `oma hook run` sans modification. Il comprend le préambule d'auto-déduplication qui supprime les doubles déclenchements lorsqu'une installation de projet et une installation globale enregistrent le même événement.

**`hud.ts`** : affiche l'indicateur `[OMA]` dans la barre d'état avec le nom du modèle, l'utilisation du contexte (couleurs vert/jaune/rouge) et l'état du workflow actif. Enregistré directement sous `statusLine` (et non routé par `oma hook run`) afin de préserver la latence d'affichage du chemin critique. Matérialisé uniquement pour les fournisseurs dont la variante enregistre un événement `statusLine` ou réservé au HUD (par exemple claude, antigravity et qwen). Il déduit le dialecte du fournisseur depuis son propre chemin d'installation ; la copie propre au fournisseur est donc nécessaire au fonctionnement.

**`filter-test-output.sh`** : filtre shell qui réduit la sortie bruyante des test runners. Le handler de filtrage de tests in-process réécrit les commandes de test Bash détectées afin de les faire passer par `<hookDir>/filter-test-output.sh` ; ce fichier est donc matérialisé pour chaque fournisseur dont la variante enregistre `test-filter.ts` (tous sauf cursor).

#### Où réside réellement la logique des handlers {#where-the-handler-logic-actually-lives}

Les sources des handlers sont la SSOT dans `.agents/hooks/core/` et s'exécutent in-process via `oma hook run` :

**`keyword-detector.ts`** : handler pur (`run(input, ctx): HandlerResult | null`) pour la détection de mots-clés. Logique :
1. Nettoie l'entrée (retire les blocs de code, les chaînes entre guillemets et les blocs d'écho système collés)
2. Analyse l'entrée nettoyée avec les `keywords` (littéraux) et `patterns` (expressions régulières) des déclencheurs
3. Vérifie les patterns informationnels dans une fenêtre de 60 caractères autour de chaque correspondance
4. Applique la protection contre le renforcement (supprime le déclenchement si le même workflow a été déclenché au moins deux fois en 60 s)
5. Renvoie un résultat `context` injectant `[OMA WORKFLOW: ...]` ou `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`** : handler pur (`run()`) qui vérifie les fichiers d'état actifs dans `.agents/state/` et renforce l'exécution des workflows persistants. Appelé in-process par `oma hook run` lors des événements `Stop`.

**`scm-guard.ts`** : handler pur (`run()`) sur `PreToolUse` (outils Bash/shell) qui refuse les `git add` de fichiers susceptibles de contenir des secrets. Il applique `forbidden_patterns` moins `allowed_exceptions` depuis `.agents/skills/oma-scm/config/commit-config.yaml` (valeurs par défaut intégrées si la configuration est absente). Il s'exécute avant `test-filter` dans la chaîne de claude, codex, cursor, grok, kimi, kiro et qwen, ainsi que dans le pont opencode (`tool.execute.before` lève une exception pour bloquer) et le pont pi (`tool_call` renvoie `{ block: true, reason }`) ; une commande préfixée par `OMA_SCM_ALLOW_SECRETS=1` contourne la protection après approbation explicite de l'utilisateur. Le staging global (`git add -A` / `git add .`) n'est volontairement pas bloqué : cette règle dépend d'un consentement utilisateur que le hook ne peut pas observer.

**`code-intelligence-guard.ts`** : handler pur (`run()`) sur `PreToolUse` qui applique mécaniquement la règle « Code Search ». Tant que `providers.code_intelligence` se résout en `serena` (ou `gortex`) et que `providers.code_intelligence_guard` n'est pas `off`, il refuse les outils de recherche natifs (`Grep`, `Glob` sur Claude Code) et les commandes shell dont le binaire principal est une recherche récursive de code (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`) ; le motif du refus nomme l'outil du fournisseur à utiliser à la place (`search_for_pattern`, `find_file`, `find_symbol`). Les `grep` non récursifs (filtres de pipe, fichiers uniques), les `find` sans prédicat de nom et les lectures ne sont jamais touchés. Il est enregistré juste après `scm-guard` pour claude, codex, cursor, grok, kimi, kiro et qwen ; l'installateur réunit les matchers de la chaîne, si bien que l'entrée `PreToolUse` de Claude devient `Bash|Grep|Glob`. Une commande shell contenant `OMA_CI_ALLOW_NATIVE=1` contourne toujours la protection, mais uniquement comme échappatoire d'opérateur pour des recherches portant sur des ressources extérieures au projet ou sur des chemins ignorés que la protection n'a pas reconnus. Le motif du refus ne nomme pas ce préfixe, et ce n'est pas un repli pour le code source du projet.

**`triggers.json`** : mapping mot-clé→workflow, intégré statiquement au binaire `oma` lors du build (source : `.agents/hooks/core/triggers.json`). Il définit :
- `workflows` : map du nom du workflow vers `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` contient des phrases littérales ; `patterns` contient des chaînes regex brutes (compilées avec les flags `iu`). `explicit` (workflows persistants uniquement) liste les mots-clés qui comptent comme une invocation explicite — seuls ceux-ci activent le mode persistant ; toute autre correspondance est injectée comme suggestion.
- `informationalPatterns` : phrases qui indiquent une question (filtrées de la détection automatique)
- `excludedWorkflows` : workflows qui nécessitent un appel explicite à `/command`

Les sections de langue de `keywords`, `patterns` et `informationalPatterns` suivent cette convention :
- `*` : universel/anglais.
- `en` : fonctionnellement équivalent à `*`.
- `ko`/`ja`/`zh`/etc. : formulations propres à une langue.

Toutes les sections sont toujours chargées ; le réglage `language` dans `.agents/oma-config.yaml` ne contrôle que la langue des réponses. Les limites de mots dépendent du mot-clé lui-même : les mots-clés ASCII ne correspondent qu'à des mots entiers, tandis que les mots-clés contenant du texte non ASCII correspondent comme sous-chaînes.

#### Matérialisation par fournisseur : avant → après {#per-vendor-materialization-before-after}

Les anciennes installations copiaient **tout** l'ensemble `.agents/hooks/core/` (environ 20 fichiers) dans le répertoire de hooks de chaque fournisseur, même si le dispatch in-process rendait la plupart de ces fichiers inutiles :

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Désormais, l'installateur dérive une liste blanche du JSON de variante du fournisseur (`requiredVariantScripts` dans `cli/platform/hooks-composer.ts`) et ne matérialise que ce que ce fournisseur exécute ou lit :

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Fournisseur | Fichiers matérialisés | Pourquoi |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, sans statusLine |
| cursor | `oma-hook.sh` | sans statusLine ni test-filter |
| commandcode | `oma-hook.sh` | Stop uniquement — Command Code n'a pas d'événement prompt et PreToolUse ne peut pas réécrire l'entrée ([référence des hooks](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | aucun (projet) — `hud.ts` + hooks core copiés dans `~/.gemini/antigravity-cli/hooks/` | agy lit les paramètres uniquement depuis HOME et les hooks du workspace depuis `.agents/hooks.json`, qui exécute directement les handlers de `.agents/hooks/core/` ; un projet `.gemini/antigravity-cli/` n'est jamais chargé (flag de variante `homeOnly`) |
| pi | ensemble complet `.agents/hooks/core/` sous `.pi/extensions/oma/` | le pont pi lance les handlers comme des sous-processus au lieu d'utiliser les hooks de paramètres |

Le répertoire de destination est vidé avant la copie. Relancer `oma install`/`oma update`/`oma link` sur une ancienne installation supprime donc automatiquement les anciens fichiers obsolètes de la copie complète.

#### Déboguer une chaîne de handlers isolément {#debugging-a-handler-chain-in-isolation}

Vous pouvez exécuter n'importe quelle chaîne de handlers sur une charge utile réelle sans déclencher la session de l'agent actif :

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` se termine toujours avec le code 0 (fail-open). Une sortie standard vide signifie que la chaîne n'a rien fait pour cet événement. Le JSON au format du fournisseur (ou le texte brut pour les prompts kiro) est écrit sur la sortie standard lorsqu'un handler se déclenche.

#### Migration depuis les installations antérieures à 019 {#migration-from-pre-019-installs}

Les installations existantes qui contiennent les anciennes entrées `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` sont migrées automatiquement lors de la prochaine exécution de `oma install`, `oma update` ou `oma link`. L'installateur utilise un remplacement fondé sur des marqueurs : seuls les groupes de hooks gérés par OMA (identifiés par leurs patterns `name`/`command`) sont remplacés ; les groupes de hooks que vous avez ajoutés vous-même conservent leur ordre d'origine. Le chemin `statusLine`/HUD ne change pas. Le pont pi in-process n'est pas concerné. Voir `cli/commands/hook/command.ts` pour l'implémentation du routeur (appelée en interne « design 019 ») et `cli/platform/hooks-composer/` pour la logique de matérialisation propre à chaque fournisseur.

### skills/ {#skills-1}

Symlinks pointant vers `.agents/skills/`. Ils rendent les compétences visibles aux IDE qui lisent `.claude/skills/`, tout en conservant `.agents/` comme source unique de vérité.

### agents/ {#agents-1}

Définitions de sous-agents au format de l'outil Agent de Claude Code. Elles référencent les fichiers de compétences et contiennent le modèle `CHARTER_CHECK`.

---

## .agents/state/memories/ : état du runtime {#agentsstatememories-runtime-state}

Les agents y écrivent leur progression pendant les sessions d'orchestration. Il s'agit du magasin canonique de mémoire de coordination ; la CLI le résout en premier et utilise en repli le répertoire historique `.serena/memories/` pour les projets créés avant son déplacement. Les fichiers de session et de tableau de tâches incluent l'identifiant de session ; les fichiers de progression et de résultat incluent les identifiants de l'agent, de la tâche, de l'exécution et de la session. Les tableaux de bord surveillent ce répertoire en temps réel.

| Fichier | Propriétaire | Rôle |
|------|-------|------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Métadonnées de session : identifiant, statut, heure de début, phase courante |
| `task-board-{sessionId}.md` | Orchestrator | Affectations : agent, tâche, priorité, statut, dépendances |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Cette exécution | Mises à jour tour par tour : actions, fichiers lus/modifiés, statut actuel |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Cette exécution | Résultat final : statut, résumé, fichiers modifiés, critères d'acceptation |
| `session-metrics.md` | Orchestrator | Corrections importantes et preuves d'expérience |
| `experiment-ledger.md` | Orchestrator/QA | Lignes de preuve pour de véritables expériences |
| `session-work.md` | Workflow Work | État de session propre à Work |
| `session-ultrawork.md` | Workflow Ultrawork | Suivi des phases propre à Ultrawork |
| `session-cost-{sessionId}.md` | Système | Télémétrie des coûts par session |
| `archive/metrics-{date}.md` | Système | Métriques archivées (rétention de 30 jours) |

Les chemins des fichiers de mémoire et les noms des outils sont configurables dans `.agents/mcp.json` avec `memoryConfig`.

Les mémoires d'intégration propres à Serena (`code_style.md`, `project_purpose.md` et les fichiers de connaissances similaires) restent dans `.serena/memories/` et sont séparées de ces artefacts de coordination.

---

## Structure du dépôt source oh-my-agent {#oh-my-agent-source-repository-structure}

Si vous travaillez sur oh-my-agent lui-même (et pas seulement sur son utilisation), le dépôt est un monorepo :

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

Dans le dépôt source, les modifications de `.agents/` sont autorisées (il s'agit de l'exception SSOT pour le dépôt source lui-même). La règle `.agents/` qui interdit de modifier ce répertoire s'applique aux projets consommateurs, et non au dépôt oh-my-agent.

Commandes de développement (à exécuter depuis la racine du dépôt) :
- `bun run test` : tests de la CLI (vitest)
- `bun run lint` : lint des workspaces CLI et web
- `bun run build` : build de la CLI
- `bun run typecheck` : vérification de types de la CLI et du web
- Les commits doivent respecter le format Conventional Commits (imposé par commitlint)
