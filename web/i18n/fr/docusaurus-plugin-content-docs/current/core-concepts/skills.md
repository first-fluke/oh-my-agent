---
title: Compétences
description: Guide complet de l'architecture de compétences en deux couches d'oh-my-agent — conception de SKILL.md, chargement de ressources à la demande, chaque ressource partagée expliquée, protocoles conditionnels, types de ressources par compétence, protocoles d'exécution par fournisseur, calcul d'économie de tokens et mécanique de routage des compétences.
---

# Compétences

Les compétences sont des paquets de connaissances structurés qui confèrent à chaque agent son expertise de domaine. Ce ne sont pas de simples prompts -- elles contiennent des protocoles d'exécution, des références de stack technique, des modèles de code, des guides de résolution d'erreurs, des checklists de qualité et des exemples few-shot, organisés dans une architecture en deux couches conçue pour l'efficacité en tokens.

---

## La conception en deux couches

### Couche 1 : SKILL.md (~800 octets, toujours chargée)

Chaque compétence possède un fichier `SKILL.md` à sa racine. Celui-ci est toujours chargé dans la fenêtre de contexte lorsque la compétence est référencée. Il contient :

- **Frontmatter YAML** avec `name` et `description` (utilisé pour le routage et l'affichage)
- **Quand utiliser / Quand NE PAS utiliser** -- conditions d'activation explicites
- **Règles fondamentales** -- les 5 à 15 contraintes les plus critiques du domaine
- **Aperçu de l'architecture** -- comment le code doit être structuré
- **Liste des bibliothèques** -- dépendances approuvées et leurs usages
- **Références** -- pointeurs vers les ressources de la couche 2 (jamais chargées automatiquement)

Exemple de frontmatter :

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Le champ description est essentiel -- il contient les mots-clés de routage que le système de routage des compétences utilise pour faire correspondre les tâches aux agents.

### Couche 2 : resources/ (chargement à la demande)

Le répertoire `resources/` contient les connaissances d'exécution approfondies. Ces fichiers ne sont chargés que lorsque :
1. L'agent est explicitement invoqué (via `/command` ou le champ skills de l'agent)
2. La ressource spécifique est nécessaire pour le type de tâche et le niveau de difficulté en cours

Ce chargement à la demande est régi par le guide de chargement du contexte (`.agents/skills/_shared/core/context-loading.md`), qui associe les types de tâches aux ressources requises par agent.

---

## Exemple de structure de fichiers

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Couche 1 : toujours chargée (~800 octets)
└── resources/
    ├── execution-protocol.md         ← Couche 2 : workflow étape par étape
    ├── tech-stack.md                 ← Couche 2 : spécifications technologiques détaillées
    ├── tailwind-rules.md             ← Couche 2 : conventions propres à Tailwind
    ├── component-template.tsx        ← Couche 2 : modèle de composant React
    ├── snippets.md                   ← Couche 2 : patterns de code copier-coller
    ├── error-playbook.md             ← Couche 2 : procédures de récupération d'erreur
    ├── checklist.md                  ← Couche 2 : checklist de vérification qualité
    └── examples/                     ← Couche 2 : exemples few-shot entrée/sortie
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← Spécifique au domaine (requêtes ORM, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← Généré par /stack-set (spécifique au langage)
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
├── reference/                         ← Documentation de référence approfondie
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## Types de ressources par compétence

| Type de ressource | Motif de nom de fichier | Objet | Quand chargé |
|--------------|-----------------|---------|-------------|
| **Protocole d'exécution** | `execution-protocol.md` | Workflow étape par étape : Analyser -> Planifier -> Implémenter -> Vérifier | Toujours (avec SKILL.md) |
| **Stack technique** | `tech-stack.md` | Spécifications technologiques détaillées, versions, configuration | Tâches complexes |
| **Error Playbook** | `error-playbook.md` | Procédures de récupération avec escalade « 3 strikes » | Uniquement en cas d'erreur |
| **Checklist** | `checklist.md` | Vérification qualité spécifique au domaine | À l'étape Vérifier |
| **Snippets** | `snippets.md` | Patterns de code prêts à copier-coller | Tâches moyennes/complexes |
| **Exemples** | `examples.md` ou `examples/` | Exemples few-shot entrée/sortie pour le LLM | Tâches moyennes/complexes |
| **Variantes** | Répertoire `stack/` | Références spécifiques au langage/framework (générées par `/stack-set`) | Lorsqu'un stack existe |
| **Modèles** | `component-template.tsx`, `screen-template.dart` | Modèles de fichiers boilerplate | À la création d'un composant |
| **Référence de domaine** | `orm-reference.md`, `anti-patterns.md`, etc. | Connaissance approfondie du domaine pour des sous-tâches spécifiques | Spécifique au type de tâche |

---

## Ressources partagées (_shared/)

Tous les agents partagent des fondations communes depuis `.agents/skills/_shared/`. Celles-ci sont organisées en trois catégories :

### Ressources centrales (`.agents/skills/_shared/core/`)

| Ressource | Objet | Quand chargé |
|----------|---------|-------------|
| **`skill-routing.md`** | Associe les mots-clés de tâche au bon agent. Contient le tableau Skill-Agent Mapping, les patterns de routage de requêtes complexes, les règles de dépendance inter-agents, les règles d'escalade et le Turn Limit Guide. | Référencé par l'orchestrateur et les compétences de coordination |
| **`context-loading.md`** | Définit quelles ressources charger selon le type et la difficulté de la tâche. Contient les tableaux de mapping type-de-tâche/ressource par agent et les déclencheurs de chargement conditionnel des protocoles. | Au démarrage du workflow (Étape 0 / Phase 0) |
| **`prompt-structure.md`** | Définit les quatre éléments que tout prompt de tâche doit contenir : Goal, Context, Constraints, Done When. Inclut des modèles pour les agents PM, implémentation et QA. Liste les anti-patterns (commencer par un Goal seul). | Référencé par l'agent PM et tous les workflows |
| **`clarification-protocol.md`** | Définit les niveaux d'incertitude (LOW/MEDIUM/HIGH) avec les actions associées. Contient les déclencheurs d'incertitude, les modèles d'escalade, les éléments de vérification requis par type d'agent et le comportement en mode sous-agent. | Lorsque les exigences sont ambiguës |
| **`context-budget.md`** | Gestion du budget de tokens. Définit la stratégie de lecture de fichiers (utiliser `find_symbol` plutôt que `read_file`), les budgets de chargement de ressources par palier de modèle (Flash : ~3 100 tokens / Pro : ~5 000 tokens), la gestion des gros fichiers et les symptômes de débordement de contexte. | Au démarrage du workflow |
| **`difficulty-guide.md`** | Critères pour classer les tâches en Simple/Moyenne/Complexe. Définit le nombre attendu de tours, le branchement de protocole (Fast Track / Standard / Étendu) et la récupération en cas de mauvaise évaluation. | Au démarrage de la tâche (Étape 0) |
| **`reasoning-templates.md`** | Modèles de raisonnement structurés à compléter pour les patterns de décision courants (par exemple le modèle #6 Exploration Decision utilisé par la boucle d'exploration). | Lors de décisions complexes |
| **`quality-principles.md`** | 4 principes qualité universels appliqués à tous les agents. | Au démarrage du workflow pour les workflows orientés qualité (ultrawork) |
| **`vendor-detection.md`** | Protocole de détection de l'environnement d'exécution courant (Claude Code, Codex CLI, Gemini CLI, Antigravity, repli CLI). Utilise des marqueurs : outil Agent = Claude Code, apply_patch = Codex, syntaxe @ = Gemini. | Au démarrage du workflow |
| **`session-metrics.md`** | Scoring de la Dette de clarification (CD) et suivi des métriques de session. Définit les types d'événements (clarify +10, correct +25, redo +40), les seuils (CD >= 50 = RCA, CD >= 80 = pause) et les points d'intégration. | Pendant les sessions d'orchestration |
| **`common-checklist.md`** | Checklist qualité universelle appliquée à la vérification finale des tâches complexes (en plus des checklists spécifiques par agent). | Étape Vérifier des tâches complexes |
| **`lessons-learned.md`** | Référentiel des enseignements de sessions passées, auto-généré à partir des dépassements de Dette de clarification et des expériences abandonnées. Organisé par section de domaine. | Référencé après les erreurs et à la fin de session |
| **`api-contracts/`** | Répertoire contenant le modèle de contrat d'API et les contrats générés. `template.md` définit le format par endpoint (méthode, chemin, schémas de requête/réponse, authentification, erreurs). | Lorsqu'un travail inter-frontières est planifié |

### Ressources d'exécution (`.agents/skills/_shared/runtime/`)

| Ressource | Objet |
|----------|---------|
| **`memory-protocol.md`** | Format des fichiers mémoire et opérations pour les sous-agents CLI. Définit les protocoles On Start, During Execution et On Completion via des outils de mémoire configurables (read/write/edit). Inclut une extension de suivi des expériences. |
| **`execution-protocols/claude.md`** | Patterns d'exécution propres à Claude Code. Injecté par `oma agent:spawn` lorsque le fournisseur est claude. |
| **`execution-protocols/gemini.md`** | Patterns d'exécution propres à Gemini CLI. |
| **`execution-protocols/codex.md`** | Patterns d'exécution propres à Codex CLI. |
| **`execution-protocols/qwen.md`** | Patterns d'exécution propres à Qwen CLI. |

Les protocoles d'exécution spécifiques au fournisseur sont injectés automatiquement par `oma agent:spawn` -- les agents n'ont pas besoin de les charger manuellement.

### Ressources conditionnelles (`.agents/skills/_shared/conditional/`)

Celles-ci ne sont chargées que lorsque des conditions spécifiques sont remplies pendant l'exécution :

| Ressource | Condition de déclenchement | Chargé par | Tokens approx. |
|----------|-------------------|-----------|----------------|
| **`quality-score.md`** | La phase VERIFY ou SHIP commence dans un workflow qui prend en charge la mesure de qualité | Orchestrateur (transmis au prompt de l'agent QA) | ~250 |
| **`experiment-ledger.md`** | La première expérience est enregistrée après l'établissement d'une ligne de base IMPL | Orchestrateur (en ligne, après la mesure de référence) | ~250 |
| **`exploration-loop.md`** | La même porte échoue deux fois sur le même problème | Orchestrateur (en ligne, avant le lancement des agents d'hypothèses) | ~250 |

Impact sur le budget : environ 750 tokens au total si les 3 sont chargées. Comme le chargement est conditionnel, les sessions typiques en chargent 1 à 2. Le budget de niveau flash reste dans l'allocation d'environ 3 100 tokens.

---

## Comment les compétences sont routées via skill-routing.md

La carte de routage des compétences définit comment les tâches sont associées aux agents :

### Routage simple (domaine unique)

Un prompt contenant « Build a login form with Tailwind CSS » correspond aux mots-clés `UI`, `component`, `form`, `Tailwind`, et est routé vers **oma-frontend**.

### Routage de requêtes complexes

Les requêtes multi-domaines suivent des ordres d'exécution établis :

| Pattern de requête | Ordre d'exécution |
|--------------------|-------------------|
| « Create a fullstack app » | oma-pm -> (oma-backend + oma-frontend) en parallèle -> oma-qa |
| « Create a mobile app » | oma-pm -> (oma-backend + oma-mobile) en parallèle -> oma-qa |
| « Fix bug and review » | oma-debug -> oma-qa |
| « Design and build a landing page » | oma-design -> oma-frontend |
| « I have an idea for a feature » | oma-brainstorm -> oma-pm -> agents concernés -> oma-qa |
| « Do everything automatically » | oma-orchestrator (en interne : oma-pm -> agents -> oma-qa) |

### Règles de dépendance inter-agents

**Peuvent s'exécuter en parallèle (pas de dépendances) :**
- oma-backend + oma-frontend (lorsque le contrat d'API est pré-défini)
- oma-backend + oma-mobile (lorsque le contrat d'API est pré-défini)
- oma-frontend + oma-mobile (indépendants l'un de l'autre)

**Doivent s'exécuter séquentiellement :**
- oma-brainstorm -> oma-pm (le design précède la planification)
- oma-pm -> tous les autres agents (la planification vient en premier)
- agent d'implémentation -> oma-qa (revue après l'implémentation)
- oma-backend -> oma-frontend/oma-mobile (en l'absence de contrat d'API pré-défini)

**Le QA est toujours en dernier**, sauf lorsque l'utilisateur demande la revue de fichiers spécifiques uniquement.

---

## Calcul des économies de tokens

Considérons une session d'orchestration à 5 agents (pm, backend, frontend, mobile, qa) :

**Sans divulgation progressive :**
- Chaque agent charge toutes les ressources : ~4 000 tokens par agent
- Total : 5 x 4 000 = 20 000 tokens consommés avant tout travail

**Avec divulgation progressive :**
- Couche 1 uniquement pour tous les agents : 5 x 800 = 4 000 tokens
- Couche 2 chargée uniquement pour les agents actifs (en général 1 à 2 à la fois) : +1 500 tokens
- Total : ~5 500 tokens

**Économies : environ 72-75 %**

Sur les modèles de niveau flash (contexte 128 Ko), c'est la différence entre avoir 108 Ko de tokens disponibles pour le travail contre 125 Ko -- une marge significative pour les tâches complexes.

---

## Chargement des ressources par difficulté de tâche

Le guide de difficulté classe les tâches en trois niveaux, qui déterminent la quantité de couche 2 chargée :

### Simple (3-5 tours attendus)

Modification d'un seul fichier, exigences claires, répétition de patterns existants.

Charge : `execution-protocol.md` uniquement. Passer l'analyse, procéder directement à l'implémentation avec une checklist minimale.

### Moyen (8-15 tours attendus)

2-3 modifications de fichiers, quelques décisions de conception nécessaires, application de patterns à de nouveaux domaines.

Charge : `execution-protocol.md` + `examples.md`. Protocole standard avec analyse brève et vérification complète.

### Complexe (15-25 tours attendus)

4+ modifications de fichiers, décisions d'architecture requises, introduction de nouveaux patterns, dépendances avec d'autres agents.

Charge : `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Protocole étendu avec points de contrôle, enregistrement de la progression en cours d'exécution, et vérification complète incluant `common-checklist.md`.

---

## Cartes de chargement du contexte par tâche (par agent)

Le guide de chargement du contexte fournit des mappings détaillés type-de-tâche/ressources. Voici les principaux mappings :

### Agent Backend

| Type de tâche | Ressources requises |
|-----------|-------------------|
| Création d'API CRUD | stack/snippets.md (route, schéma, modèle, test) |
| Authentification | stack/snippets.md (JWT, mot de passe) + stack/tech-stack.md |
| Migration de base de données | stack/snippets.md (migration) |
| Optimisation de performance | examples.md (exemple N+1) |
| Modification de code existant | examples.md + Serena MCP |

### Agent Frontend

| Type de tâche | Ressources requises |
|-----------|-------------------|
| Création de composant | snippets.md + component-template.tsx |
| Implémentation de formulaire | snippets.md (formulaire + Zod) |
| Intégration API | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Mise en page de page | snippets.md (grid) + examples.md |

### Agent Design

| Type de tâche | Ressources requises |
|-----------|-------------------|
| Création de design system | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Design de page d'atterrissage | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| Audit de design | checklist.md + anti-patterns.md |
| Export de tokens de design | design-tokens.md |
| Effets 3D / shaders | reference/shader-and-3d.md + reference/motion-design.md |
| Revue d'accessibilité | reference/accessibility.md + checklist.md |

### Agent QA

| Type de tâche | Ressources requises |
|-----------|-------------------|
| Revue de sécurité | checklist.md (section Sécurité) |
| Revue de performance | checklist.md (section Performance) |
| Revue d'accessibilité | checklist.md (section Accessibilité) |
| Audit complet | checklist.md (complet) + self-check.md |
| Quality scoring | quality-score.md (conditionnel) |

---

## Composition des prompts par l'orchestrateur

Lorsque l'orchestrateur compose les prompts pour les sous-agents, il n'inclut que les ressources pertinentes pour la tâche :

1. La section des règles fondamentales du SKILL.md de l'agent
2. `execution-protocol.md`
3. Les ressources correspondant au type de tâche (selon les tableaux ci-dessus)
4. `error-playbook.md` (toujours inclus, la récupération est essentielle)
5. Protocole de mémoire Serena (mode CLI)

Cette composition ciblée évite le chargement de ressources inutiles, maximisant le contexte disponible du sous-agent pour le travail effectif.

---

## Dette de clarification et métriques de session (analyse approfondie)

La Dette de clarification (Clarification Debt, CD) mesure le coût des exigences floues au cours d'une session. L'orchestrateur enregistre chaque correction utilisateur et lui attribue un score :

| Type d'événement | Points | Description |
|------------------|--------|-------------|
| `clarify` | +10 | Question de clarification simple (attendue pour une incertitude MEDIUM) |
| `correct` | +25 | Malentendu d'intention nécessitant un changement de direction |
| `redo` | +40 | Violation de périmètre ou de charte nécessitant un retour en arrière et un redémarrage |
| `blocked` | +0 | L'agent s'est correctement arrêté pour poser une question (bon comportement, non pénalisé) |

**Modificateurs :** charte non lue (+15), violation de la liste blanche (+20), même erreur répétée (×1,5).

**Seuils et application :**
- **CD ≥ 50** → entrée RCA obligatoire ajoutée à `lessons-learned.md`
- **CD ≥ 80** → session interrompue, l'utilisateur doit re-spécifier les exigences
- **`redo` ≥ 2** → l'orchestrateur met en pause et demande une confirmation explicite du périmètre
- **CD ≥ 30 sur 3 sessions consécutives pour le même agent** → revue du modèle de prompt de l'agent

Le journal de session est conservé dans `.serena/memories/session-metrics.md` avec une ligne par événement (tour, agent, type d'événement, points, détail) et une section de synthèse.

---

## Précision de l'évaluateur et ajustement QA

Les agents QA s'améliorent grâce au suivi des erreurs de jugement. Contrairement à la CD (en temps réel), la Précision de l'évaluateur (Evaluator Accuracy, EA) est rétrospective : la plupart des erreurs sont découvertes après la fin de la session.

**Types d'événements EA :**

| Événement | Points | Quand on le découvre |
|-----------|--------|----------------------|
| `false_negative` | +30 | Session suivante ou en production — bug que la QA a manqué |
| `false_positive` | +15 | En cours de session — l'agent d'implémentation conteste avec succès une remarque QA |
| `severity_mismatch` | +10 | En cours de session ou en rétrospective — mauvaise sévérité attribuée |
| `missed_stub` | +20 | La vérification d'exécution détecte une fonctionnalité purement visuelle |
| `good_catch` | -10 | La QA a détecté un bug non évident (signal de récompense positif) |

**L'EA est calculée sur une fenêtre glissante de 3 sessions.** Seuils :
- **EA ≥ 30** → `oma retro` signale les schémas QA pour revue (ajustement suggéré)
- **EA ≥ 50** → ajustement requis : mettre à jour `execution-protocol.md` de la QA
- **`false_negative` ≥ 3** sur la fenêtre → ajouter un schéma de détection à `checklist.md` de la QA
- **`good_catch` ≥ 5** sur la fenêtre → documenter et propager le schéma efficace

La boucle complète d'ajustement est définie dans `evaluator-tuning.md` : les sessions accumulent des événements EA → un seuil déclenche `oma retro` → le rapport classe les erreurs et propose des correctifs → l'utilisateur revoit et approuve → les correctifs sont appliqués à `checklist.md` ou au protocole de la QA → validation sur les 3 sessions suivantes.

---

## Décomposition en sprints pour les tâches complexes

Les tâches complexes (4 fichiers et plus, décisions d'architecture) reposent sur une exécution par sprints plutôt que sur une exécution longue unique :

1. **Décomposer** en 2 à 4 sprints centrés sur une fonctionnalité, chacun testable de manière indépendante
2. **Viser** 5 à 8 tours par sprint
3. **Sprint Gate** après chaque sprint :
   - Le livrable du sprint est-il complet ?
   - Le lint et les tests passent-ils ?
   - Si le sprint a pris deux fois plus de tours que prévu → écrire un checkpoint et informer l'utilisateur
4. **Continuer** vers le sprint suivant si le gate est validé

**Exemple :** la tâche « Authentification JWT + API CRUD + tests » se décompose en :
- Sprint 1 : modèle utilisateur + endpoints d'authentification (register/login)
- Sprint 2 : endpoints CRUD + validation
- Sprint 3 : tests + gestion des erreurs

**Récupération en cas de mauvaise estimation de difficulté :** si une tâche commencée en Simple s'avère plus complexe, l'agent passe au protocole Medium ou Complex en cours d'exécution et consigne le changement dans son fichier de progression.

---

## Protocole de réinitialisation du contexte

Les agents qui s'exécutent longtemps perdent en qualité à mesure que leur contexte se remplit. C'est l'orchestrateur (et non l'agent lui-même) qui surveille cette dégradation et déclenche les réinitialisations.

**Conditions de déclenchement (vérifiées par l'orchestrateur pendant la surveillance) :**

| Condition | Détection | Action |
|-----------|-----------|--------|
| Épuisement du budget de tours | L'agent a consommé ≥ 80 % des tours prévus ET les critères d'acceptation sont remplis à moins de 50 % | Réinitialisation du contexte |
| Stagnation de la progression | Aucune mise à jour du fichier de progression sur 3 cycles de surveillance consécutifs | Réinitialisation du contexte |
| Sortie superficielle | Le fichier de résultat contient des marqueurs de stub ou des placeholders TODO | Re-spawn avec une instruction explicite |

**Procédure de réinitialisation :**
1. **Checkpoint** — sauvegarder l'état courant de l'agent (éléments terminés, restants, décisions clés)
2. **Terminer** — arrêter l'exécution de l'agent en cours
3. **Re-spawn** — démarrer un nouvel agent avec le checkpoint comme contexte
4. **Reprendre** — le nouvel agent lit le checkpoint et ne traite que les éléments restants

Pour les agents autonomes (sans orchestrateur), le Sprint Gate défini dans `difficulty-guide.md` joue le rôle de filet de sécurité : si un sprint prend deux fois plus de tours que prévu, l'agent écrit un checkpoint et informe l'utilisateur.
